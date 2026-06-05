import { SearchIcon, PanelLeft } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../features/themeSlice'
import { MoonIcon, SunIcon } from 'lucide-react'
import { UserButton, useAuth, useClerk } from '@clerk/clerk-react'

const Navbar = ({ setIsSidebarOpen }) => {

    const dispatch = useDispatch();
    const { theme } = useSelector(state => state.theme);
    const { isSignedIn } = useAuth();
    const { openSignIn, openSignUp } = useClerk();

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 flex-shrink-0">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Ліва секція */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Кнопка відкриття сайдбару */}
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <PanelLeft size={20} />
                    </button>

                    {/* Поле пошуку */}
                    <div className="relative flex-1 max-w-sm">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks..."
                            className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                </div>

                {/* Права секція */}
                <div className="flex items-center gap-3">

                    {/* Перемикач теми */}
                    <button onClick={() => dispatch(toggleTheme())} className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95">
                        {
                            theme === "light"
                                ? (<MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />)
                                : (<SunIcon className="size-4 text-yellow-400" />)
                        }
                    </button>

                    {isSignedIn ? (
                        <UserButton />
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openSignIn()}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition"
                            >
                                Увійти
                            </button>
                            <button
                                onClick={() => openSignUp()}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition"
                            >
                                Реєстрація
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar
