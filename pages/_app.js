import "../styles/globals.css"
import Header from "../components/Header"
import { ThemeProvider } from "../components/ThemeContext"

function MyApp({ Component, pageProps }) {
    return (
        <ThemeProvider>
            <Header />
            <Component {...pageProps} />
        </ThemeProvider>
    )
}

export default MyApp
