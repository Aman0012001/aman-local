import React from 'react';
import Link from 'next/link';
import logo from '@/public/logo.png';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">

                    <div className="col-span-2">
                        <Link className="flex items-center mb-6 group overflow-hidden h-16" href="/">
                            <div className="h-24 w-40 relative transition-colors duration-300">
                                <Image
                                    src={logo}
                                    alt="naampata logo"
                                    fill
                                    priority
                                    className="object-contain scale-[2.5]"
                                />
                            </div>
                        </Link>
                        <p className="text-slate-500 text-sm max-w-xs mb-6 font-medium leading-relaxed">
                            Discover the best local businesses, services, and professionals in your area. Your trusted local guide to everything around you.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-[#112D4E] mb-5 uppercase tracking-wider text-xs">Discover</h4>
                        <ul className="space-y-3 text-sm text-slate-600 font-bold">
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/search?category=restaurants-food">Restaurants</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/search?category=beauty-spa">Health & Wellness</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/search?category=education">Education</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/search?category=automobile">Automotive</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-[#112D4E] mb-5 uppercase tracking-wider text-xs">For Vendors</h4>
                        <ul className="space-y-3 text-sm text-slate-600 font-bold">
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/register?role=vendor">Add Business</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/login">Vendor Login</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-[#112D4E] mb-5 uppercase tracking-wider text-xs">Company</h4>
                        <ul className="space-y-3 text-sm text-slate-600 font-bold">
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/about">About Us</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/contact">Contact</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/terms">Terms of Service</Link></li>
                            <li><Link className="hover:text-[#FF7A30] transition-colors" href="/privacy">Privacy Policy</Link></li>
                        </ul>
                    </div>

                </div>

                <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-bold">
                    <p>© 2026 naampata. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link className="hover:text-[#FF7A30] transition-colors uppercase tracking-widest" href="#">Twitter</Link>
                        <Link className="hover:text-[#FF7A30] transition-colors uppercase tracking-widest" href="#">LinkedIn</Link>
                        <Link className="hover:text-[#FF7A30] transition-colors uppercase tracking-widest" href="#">Instagram</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
