import Link from "next/link";
import Image from "next/image";
import { useTheme } from "./ThemeContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="bg-blue-900 py-4 shadow">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" legacyBehavior>
          <a>
            <Image src="/images/logo.png" alt="Logo" width={120} height={120} />
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
          <a
            href="https://github.com/robmcelhinney/lobbyieng/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-white hover:text-gray-300"
            aria-label="GitHub Repository"
          >
            <svg
              height="24"
              width="24"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
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
  );
}
