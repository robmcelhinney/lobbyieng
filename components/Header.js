import Link from "next/link"
import Image from "next/image"
import { useTheme } from "./ThemeContext"
import { useState } from "react"

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="bg-blue-900 py-2 shadow">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center justify-between">
        <Link href="/" legacyBehavior>
          <a className="flex-shrink-0 flex items-center" style={{ minWidth: 0 }}>
            <div className="relative" style={{ width: 120, height: 80 }}>
              <Image
                src="/images/logo.png"
                alt="Logo"
                layout="fill"
                objectFit="contain"
                sizes="(max-width: 640px) 96px, 80px"
                priority
              />
            </div>
          </a>
        </Link>
        {/* Hamburger for mobile */}
        <button
          className="sm:hidden ml-2 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-white"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* Navigation */}
        <nav
          className={`${
            menuOpen ? "flex" : "hidden"
          } sm:flex flex-col sm:flex-row gap-4 sm:gap-6 items-center absolute sm:static top-16 left-0 w-full sm:w-auto bg-blue-900 sm:bg-transparent z-20 px-4 sm:px-0 py-4 sm:py-0 transition-all`}
        >
          <Link href="/dail" legacyBehavior>
            <a className="text-white text-base sm:text-lg font-semibold hover:underline py-1">Find a TD</a>
          </Link>
          <Link href="/officials" legacyBehavior>
            <a className="text-white text-base sm:text-lg font-semibold hover:underline py-1">All Officials</a>
          </Link>
          <Link href="/lobbyists" legacyBehavior>
            <a className="text-white text-base sm:text-lg font-semibold hover:underline py-1">Find a Lobbyist</a>
          </Link>
          <a
            href="https://github.com/robmcelhinney/lobbyieng/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-0 sm:ml-2 text-white hover:text-gray-300 py-1"
            aria-label="GitHub Repository"
          >
            <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <button
            onClick={toggleTheme}
            className="ml-0 sm:ml-4 px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-cb-light-text dark:text-cb-dark-text dark:text-gray-100 border border-gray-400 dark:border-gray-700 transition mt-2 sm:mt-0"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </nav>
      </div>
    </header>
  )
}
