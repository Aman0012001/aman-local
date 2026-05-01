import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { User, UserRole, AuthProvider } from '../../entities/user.entity';
import { Affiliate } from '../../entities/affiliate.entity';
import { AffiliateReferral } from '../../entities/referral.entity';
import { Vendor } from '../../entities/vendor.entity';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { SubscriptionPlan, SubscriptionPlanType } from '../../entities/subscription-plan.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload, JwtTokens } from '../../common/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AffiliateService } from '../affiliate/affiliate.service';
import { generateReferralCode } from '../../common/utils/referral-code';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private notificationsService: NotificationsService,
        @InjectRepository(Affiliate)
        private affiliateRepository: Repository<Affiliate>,
        @InjectRepository(AffiliateReferral)
        private referralRepository: Repository<AffiliateReferral>,
        @InjectRepository(Vendor)
        private vendorRepository: Repository<Vendor>,
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(SubscriptionPlan)
        private planRepository: Repository<SubscriptionPlan>,
        private affiliateService: AffiliateService,
    ) { }

    /**
     * Auto-assign the Free plan to a vendor
     */
    private async assignFreePlan(vendorId: string): Promise<void> {
        try {
            // Find a free plan
            const freePlan = await this.planRepository.findOne({
                where: { 
                    planType: SubscriptionPlanType.FREE,
                    isActive: true
                }
            });

            if (!freePlan) {
                this.logger.warn(`[GoogleAuth] Cannot auto-assign free plan: No active free plan found.`);
                return;
            }

            const now = new Date();
            const endDate = new Date(now);
            endDate.setFullYear(now.getFullYear() + 10); // Free plan active for 10 years by default

            const subscription = this.subscriptionRepository.create({
                vendorId: vendorId,
                planId: freePlan.id,
                status: SubscriptionStatus.ACTIVE,
                startDate: now,
                endDate: endDate,
                amount: 0,
                autoRenew: false,
            });

            await this.subscriptionRepository.save(subscription);
            this.logger.log(`[GoogleAuth] Successfully assigned free plan to vendor ${vendorId}.`);
        } catch (error) {
            this.logger.error(`[GoogleAuth] Failed to auto-assign free plan to vendor ${vendorId}: ${error.message}`);
        }
    }

    /**
     * Register a new user
     */
    async register(registerDto: RegisterDto): Promise<{ user: User; tokens: JwtTokens }> {
        const { email, password, fullName, phone } = registerDto;

        // Check if user already exists (case-insensitive)
        const existingUser = await this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(user.email) = LOWER(:email)', { email })
            .getOne();

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in database
        const user = this.userRepository.create({
            email: email.toLowerCase(), // Store emails in lowercase
            password: hashedPassword,
            fullName,
            phone,
            role: (registerDto.role as UserRole) || UserRole.USER,
            provider: AuthProvider.LOCAL,
            isEmailVerified: true, // Auto-verify for local auth
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        // Auto-create vendor profile and affiliate record for vendors
        if (savedUser.role === UserRole.VENDOR) {
            const vendor = this.vendorRepository.create({
                userId: savedUser.id,
                isVerified: false,
            });
            await this.vendorRepository.save(vendor);
            this.logger.log(`Auto-created vendor profile for user ${savedUser.id}`);

            const affiliate = this.affiliateRepository.create({
                user: savedUser,
                referralCode: generateReferralCode(),
            });
            await this.affiliateRepository.save(affiliate);
            this.logger.log(`Auto-created affiliate record for vendor ${savedUser.id}`);
        }

        const tokens = await this.generateTokens(savedUser);
        delete savedUser.password;

        if (registerDto.referralCode && savedUser.role === UserRole.VENDOR) {
            await this.handleReferral(registerDto.referralCode, savedUser.id);
        }

        return { user: savedUser, tokens };
    }

    /**
     * Login with email and password
     */
    async login(loginDto: LoginDto): Promise<{ user: User; tokens: JwtTokens }> {
        const { email, password } = loginDto;

        // Find user in database with password (case-insensitive email)
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .leftJoinAndSelect('user.vendor', 'vendor')
            .leftJoinAndSelect('vendor.subscriptions', 'subscriptions')
            .leftJoinAndSelect('subscriptions.plan', 'plan')
            .where('LOWER(user.email) = LOWER(:email) AND user.isActive = :isActive', { email, isActive: true })
            .getOne();

        if (!user) {
            this.logger.warn(`Login failed: User not found or inactive for email: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        // ── Google-only account guard ──────────────────────────────────────────
        // If the user was created via Google and has never set a password, we
        // cannot validate a password.  Give a clear error rather than a cryptic
        // "Invalid credentials" so the user knows how to proceed.
        if (!user.password) {
            if (user.provider === AuthProvider.GOOGLE) {
                throw new UnauthorizedException(
                    'This account was created with Google. Please sign in using the "Continue with Google" button.',
                );
            }
            // Local account with no password set — edge case, treat as invalid.
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login, isOnline and phone if provided (Non-critical updates)
        try {
            user.lastLoginAt = new Date();
            user.isOnline = true;
            if (loginDto.phone && user.phone !== loginDto.phone) {
                user.phone = loginDto.phone;
            }
            await this.userRepository.save(user);
            this.logger.log(`User ${user.email} logged in. isOnline set to true.`);
        } catch (updateError) {
            this.logger.warn(`Failed to update user login metadata for ${user.email} (continuing): ${updateError.message}`);
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Remove sensitive data
        delete user.password;

        return { user, tokens };
    }

    /**
     * Login with Google OAuth ID token
     */
    async googleLogin(dto: GoogleAuthDto): Promise<{ user: User; tokens: JwtTokens }> {
        const { credential } = dto;

        if (!credential) {
            throw new BadRequestException('Google credential token is required');
        }

        // ConfigService can occasionally return undefined in the ts-node dev server
        // even when the .env value is present, so fall back directly to process.env.
        const clientId =
            this.configService.get<string>('GOOGLE_CLIENT_ID') ||
            process.env.GOOGLE_CLIENT_ID;

        this.logger.log(
            `[GoogleAuth] GOOGLE_CLIENT_ID resolved: ${clientId ? clientId.substring(0, 20) + '...' : 'MISSING'}`,
        );

        if (!clientId) {
            this.logger.error(
                '[GoogleAuth] GOOGLE_CLIENT_ID is not configured. ' +
                'Add GOOGLE_CLIENT_ID=<your-client-id> to the .env file and restart the server.',
            );
            throw new UnauthorizedException('Google authentication is not configured');
        }

        // Verify token with Google
        const client = new OAuth2Client(clientId);
        let payload: any;
        try {
            // Try as ID Token first (Standard button)
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: clientId,
            });
            payload = ticket.getPayload();
        } catch (error) {
            // Token is not a Google ID Token — try treating it as an OAuth2 Access Token
            // (this is what useGoogleLogin from @react-oauth/google returns by default)
            this.logger.log(
                `[GoogleAuth] ID Token verify failed ("${error.message}"). Attempting Access Token userinfo fallback...`,
            );
            try {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${credential}` },
                });

                if (!userInfoResponse.ok) {
                    const errorText = await userInfoResponse.text();
                    throw new Error(
                        `Google UserInfo API responded with ${userInfoResponse.status}: ${errorText}`,
                    );
                }

                payload = await userInfoResponse.json();
                this.logger.log(
                    `[GoogleAuth] UserInfo response fields: ${Object.keys(payload).join(', ')}`,
                );
            } catch (fallbackError) {
                this.logger.error(
                    `[GoogleAuth] Both token paths failed.` +
                    ` ID-token error: ${error.message}.` +
                    ` Userinfo error: ${fallbackError.message}`,
                );
                throw new UnauthorizedException('Invalid or expired Google token. Please try signing in again.');
            }
        }

        // Validate that we got a usable email from either token path
        if (!payload || !payload.email) {
            this.logger.error(
                `[GoogleAuth] Payload missing email. Received fields: ${payload ? Object.keys(payload).join(', ') : 'null'}`,
            );
            throw new UnauthorizedException('Could not retrieve email from Google account. Make sure your Google account has a verified email.');
        }

        // Normalize: Google ID tokens use 'sub', userinfo v3 also uses 'sub'
        const { email, name, picture, sub: googleId } = payload;
        this.logger.log(`[GoogleAuth] Successfully verified Google user: ${email} (sub: ${googleId})`);

        // Find or create user
        let user = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.vendor', 'vendor')
            .leftJoinAndSelect('vendor.subscriptions', 'subscriptions')
            .leftJoinAndSelect('vendor.activePlans', 'activePlans')
            .leftJoinAndSelect('subscriptions.plan', 'plan')
            .where('user.email = :email', { email })
            .getOne();

        if (user) {
            // ── Merge: existing account found, link Google if not already linked ──
            if (!user.googleId) {
                user.googleId = googleId;
                // If this was a local-only account, mark it as linked to both providers
                user.provider =
                    user.provider === AuthProvider.LOCAL ? AuthProvider.BOTH : AuthProvider.GOOGLE;
                if (!user.avatarUrl && picture) {
                    user.avatarUrl = picture;
                }
                user.lastLoginAt = new Date();
                user.isOnline = true;
                await this.userRepository.save(user);
                this.logger.log(`[GoogleAuth] Linked Google to existing account and marked online: ${email}`);
            } else {
                user.lastLoginAt = new Date();
                user.isOnline = true;
                await this.userRepository.save(user);
                this.logger.log(`[GoogleAuth] Existing Google user marked online: ${email}`);
            }

            // Fix for Vendor Role Upgrade via Google Login
            if (dto.role === UserRole.VENDOR && user.role === UserRole.USER) {
                this.logger.log(`[GoogleAuth] Upgrading existing user ${email} from USER to VENDOR`);
                user.role = UserRole.VENDOR;
                await this.userRepository.save(user);

                // Auto-create vendor and affiliate records for the newly upgraded vendor
                try {
                    const vendor = this.vendorRepository.create({
                        userId: user.id,
                        isVerified: false,
                    });
                    const savedVendor = await this.vendorRepository.save(vendor);
                    this.logger.log(`[GoogleAuth] Auto-created vendor profile for upgraded user`);

                    // Auto-assign FREE plan for newly upgraded vendor
                    await this.assignFreePlan(savedVendor.id);
                } catch (err: any) {
                    if (err.code !== '23505') this.logger.error('Failed to create vendor profile', err);
                }

                try {
                    const affiliate = this.affiliateRepository.create({
                        user: user,
                        referralCode: generateReferralCode(),
                    });
                    await this.affiliateRepository.save(affiliate);
                    this.logger.log(`[GoogleAuth] Auto-created affiliate profile for upgraded user`);
                } catch (err: any) {
                    if (err.code !== '23505') this.logger.error('Failed to create affiliate record', err);
                }
            } else if (user.role === UserRole.VENDOR) {
                // They are already a vendor. Check if they have an active plan
                const hasActiveSub = user.vendor?.subscriptions?.some(sub => sub.status === 'active');
                
                if (!hasActiveSub && user.vendor) {
                    this.logger.log(`[GoogleAuth] Existing vendor ${email} lacks an active plan. Auto-assigning FREE plan.`);
                    await this.assignFreePlan(user.vendor.id);
                }
            }
        } else {
            // Create new user from Google profile
            const newUser = this.userRepository.create({
                email,
                fullName: name || email.split('@')[0],
                avatarUrl: picture || null,
                googleId,
                provider: AuthProvider.GOOGLE,
                role: (dto.role as UserRole) || UserRole.USER,
                isEmailVerified: true,
                isActive: true,
                lastLoginAt: new Date(),
                isOnline: true,
            });
            user = await this.userRepository.save(newUser);
            this.logger.log(`[GoogleAuth] Created and marked online new user from Google: ${email}`);

            // Auto-create affiliate record for vendors
            if (user.role === UserRole.VENDOR) {
                const vendor = this.vendorRepository.create({
                    userId: user.id,
                    isVerified: false,
                });
                const savedVendor = await this.vendorRepository.save(vendor);
                this.logger.log(`[GoogleAuth] Auto-created vendor profile for user ${user.id}`);

                const affiliate = this.affiliateRepository.create({
                    user: user,
                    referralCode: generateReferralCode(),
                });
                await this.affiliateRepository.save(affiliate);
                this.logger.log(`[GoogleAuth] Auto-created affiliate record for vendor ${user.id}`);

                // Auto-assign FREE plan for newly created vendor
                await this.assignFreePlan(savedVendor.id);
            }
        }

        // Re-fetch user to ensure all newly created relations (vendor, subscriptions) are fully loaded into memory
        user = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.vendor', 'vendor')
            .leftJoinAndSelect('vendor.subscriptions', 'subscriptions')
            .leftJoinAndSelect('vendor.activePlans', 'activePlans')
            .leftJoinAndSelect('subscriptions.plan', 'plan')
            .where('user.id = :id', { id: user.id })
            .getOne() as User;

        if (!user) {
            throw new UnauthorizedException('Failed to finalize user data during Google Auth');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Remove sensitive data
        if (user.password) {
            delete user.password;
        }

        // Handle referral if provided (for new or upgraded vendors)
        if (dto.referralCode && user.role === UserRole.VENDOR) {
            await this.handleReferral(dto.referralCode, user.id);
        }

        return { user, tokens };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<JwtTokens> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            const user = await this.userRepository.findOne({
                where: { id: payload.sub, isActive: true },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Logout user
     */
    async logout(userId: string): Promise<void> {
        await this.userRepository.update(userId, {
            isOnline: false,
            lastLogoutAt: new Date(),
        });
        this.logger.log(`User ${userId} logged out. isOnline set to false.`);
    }

    /**
     * Mark user as online (heartbeat ping)
     */
    async markOnline(userId: string): Promise<void> {
        try {
            await this.userRepository.update(userId, {
                isOnline: true,
                lastActiveAt: new Date(),
            });
        } catch (error) {
            this.logger.error(`Failed to mark user ${userId} as online: ${error.message}`, error.stack);
            // Optionally rethrow or handle silently depending on requirements
            throw error; 
        }
    }

    /**
     * Generate JWT tokens
     */
    private async generateTokens(user: User): Promise<JwtTokens> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload as any, {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get<string>('JWT_EXPIRATION') as any,
            }),
            this.jwtService.signAsync(payload as any, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as any,
            }),
        ]);

        return { accessToken, refreshToken };
    }

    /**
     * Validate user by ID
     */
    async validateUser(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId, isActive: true },
            relations: ['vendor'],
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }

    /**
     * Handle referral tracking
     */
    private async handleReferral(referralCode: string, referredUserId: string): Promise<void> {
        try {
            const normalizedCode = referralCode.trim();
            const affiliate = await this.affiliateRepository.findOne({
                where: { referralCode: ILike(normalizedCode) },
                relations: ['user']
            });

            if (affiliate && affiliate.user && affiliate.user.role === 'vendor') {
                // Check if referral already exists to avoid duplicates
                const existingReferral = await this.referralRepository.findOne({
                    where: { referredUserId }
                });

                if (!existingReferral) {
                    const referral = this.referralRepository.create({
                        affiliateId: affiliate.id,
                        referredUserId: referredUserId,
                        type: 'signup' as any,
                        status: 'pending' as any,
                    });
                    await this.referralRepository.save(referral);
                    this.logger.log(`[Referral] Created PENDING referral for user ${referredUserId} from affiliate ${affiliate.id}`);

                    // AUTOMATION: Immediately process the referral to activate features for the vendor
                    try {
                        // We pass 0 as amount because this is just a signup trigger (Free Plan by default).
                        // Rewards will only trigger later when as successful purchase occurs.
                        await this.affiliateService.processSuccessfulReferral(referredUserId, 0);
                        this.logger.log(`[Referral] Automated feature activation triggered for referred user ${referredUserId}`);
                    } catch (procErr) {
                        this.logger.error(`[Referral] Failed to AUTOMATE feature activation for ${referredUserId}: ${procErr.message}`);
                    }
                }
            } else {
                this.logger.warn(`[Referral] Invalid referral code provided: ${referralCode}`);
            }
        } catch (error) {
            this.logger.error(`[Referral] Failed to process referral handling: ${error.message}`);
        }
    }
}
