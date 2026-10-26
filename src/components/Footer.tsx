import React from "react";
import Link from "next/link";
import { Headphones, ShieldCheck, Mail, HelpCircle, FileText, Heart, MessageSquare } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#04060A] border-t border-white/[0.08] text-gray-400 text-xs mt-20 pb-36 sm:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] flex items-center justify-center text-[#06080D]">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="font-serif text-xl font-bold text-white tracking-tight">АУДИОТЕКА <span className="text-[#F59E0B] text-xs font-mono font-black">PRO</span></span>
            </Link>
            <p className="text-[11px] leading-relaxed text-gray-400">
              Премиальная онлайн-витрина аудиокниг. Слушайте шедевры мировой литературы, свежую фантастику и детективы в отличном студийном качестве.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Без VPN в РФ • Прямой стриминг</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Каталог</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="hover:text-[#F59E0B] transition-colors">Все аудиокниги</Link></li>
              <li><Link href="/?genre=Фантастика" className="hover:text-[#F59E0B] transition-colors">Фантастика и фэнтези</Link></li>
              <li><Link href="/?genre=Детективы" className="hover:text-[#F59E0B] transition-colors">Детективы и триллеры</Link></li>
              <li><Link href="/?genre=Классика" className="hover:text-[#F59E0B] transition-colors">Золотая классика</Link></li>
              <li><Link href="/?genre=Психология" className="hover:text-[#F59E0B] transition-colors">Психология и бизнес</Link></li>
            </ul>
          </div>

          {/* Service & Contacts */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Связь и правила</h4>
            <ul className="space-y-2">
              <li><Link href="/faq" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-[#F59E0B]" /> Вопросы и ответы (FAQ)</Link></li>
              <li><Link href="/copyright" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-emerald-400" /> Правообладателям (DMCA)</Link></li>
              <li><Link href="/contacts" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-400" /> audioteka.ru@yandex.ru</Link></li>
              <li>
                <a
                  href="https://max.ru/u/f9LHodD0cOIrfR0dw2CkwAAT0M5u0WcciTLZbmGKEXXSndxyKNLW6-mYdjE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white text-blue-400 transition-colors flex items-center gap-1.5 font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Мессенджер MAX
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Disclaimer */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Правовой статус</h4>
            <p className="text-[11px] leading-relaxed text-gray-500">
              «Аудиотека PRO» является некоммерческим информационным посредником (ст. 1253.1 ГК РФ). Все аудиоматериалы индексируются автоматически из открытых сетевых источников. Почта для обращений: <b className="text-gray-400">audioteka.ru@yandex.ru</b>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} «Аудиотека PRO» (audioteka-pro.ru). Все права защищены.</p>
          <p className="flex items-center gap-1">
            Сделано с любовью к хорошим книгам <Heart className="w-3 h-3 text-red-500 fill-current inline" />
          </p>
        </div>
      </div>
    </footer>
  );
}
