// components/Badge.js
export default function Badge({ children, className = "" }) {
    return (
        <span
            className={
                `inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ` +
                `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ` +
                className
            }
        >
            {children}
        </span>
    )
}
