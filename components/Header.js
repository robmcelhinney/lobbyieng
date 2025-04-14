import Link from "next/link"
import Image from "next/image"

export default function Header() {
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
                    <Link href="/lobbyists" legacyBehavior>
                        <a className="text-white text-lg font-semibold hover:underline">
                            Find a Lobbyist
                        </a>
                    </Link>
                    <Link href="/officials" legacyBehavior>
                        <a className="text-white text-lg font-semibold hover:underline">
                            All Officials
                        </a>
                    </Link>
                    <Link href="/dail" legacyBehavior>
                        <a className="text-white text-lg font-semibold hover:underline">
                            Find a Politician
                        </a>
                    </Link>
                </nav>
            </div>
        </header>
    )
}
