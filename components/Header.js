import Link from "next/link"
import Image from "next/image"

export default function Header() {
    return (
        <header className="bg-blue-900 py-4 shadow">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
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
            </div>
        </header>
    )
}
