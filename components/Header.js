import Link from "next/link"
import Image from "next/image"
import { useTheme } from "./ThemeContext"

export default function Header() {
    const { theme, toggleTheme } = useTheme()
    return (
        <header className="bg-blue-900 py-4 shadow">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
                <Link href="/" legacyBehavior>
                    <a>
                        <Image
                            src="/images/logo.png"
                            alt="Logo"
                            width={120}
                            height={120}
                        />
                    </a>
                </Link>
                <nav className="flex gap-6 items-center">
                    <Link href="/dail" legacyBehavior>
                        <a className="text-white text-lg font-semibold hover:underline">
                            Find a TD
                        </a>
                    </Link>
                    <Link href="/officials" legacyBehavior>
                        <a className="text-white text-lg font-semibold hover:underline">
                            All Officials
                        </a>
                    </Link>
                    <Link href="/lobbyists" legacyBehavior>
                        <a className="text-white text-lg font-semibold hover:underline">
                            Find a Lobbyist
                        </a>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="ml-4 px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-cb-light-text dark:text-cb-dark-text dark:text-gray-100 border border-gray-400 dark:border-gray-700 transition"
                        aria-label="Toggle dark mode"
                    >
                        {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                    </button>
                </nav>
            </div>
        </header>
    )
}
