import { FolderKanban, Users, CheckSquare, ArrowRight, LayoutDashboard } from 'lucide-react'
import { useClerk } from '@clerk/clerk-react'

const features = [
    {
        icon: FolderKanban,
        title: 'Управління проєктами',
        description: 'Створюйте проєкти, відстежуйте прогрес і керуйте дедлайнами в одному місці.',
    },
    {
        icon: CheckSquare,
        title: 'Завдання та Kanban',
        description: 'Розподіляйте завдання між учасниками команди та контролюйте статуси.',
    },
    {
        icon: Users,
        title: 'Командна робота',
        description: 'Запрошуйте колег у воркспейс і працюйте разом над спільними цілями.',
    },
]

const GuestLanding = () => {
    const { openSignIn, openSignUp } = useClerk()

    return (
        <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-br from-blue-50 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 p-8 sm:p-12 mb-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium mb-6">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Project Management
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                        Керуйте проєктами та командою ефективно
                    </h1>
                    <p className="text-gray-600 dark:text-zinc-400 text-base sm:text-lg mb-8 leading-relaxed">
                        Переглядайте інтерфейс безкоштовно. Увійдіть або зареєструйтесь, щоб створювати воркспейси, проєкти та завдання.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => openSignIn()}
                            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition"
                        >
                            Увійти
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => openSignUp()}
                            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                        >
                            Створити акаунт
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-10">
                {features.map((feature) => {
                    const IconComponent = feature.icon;
                    return (
                    <div
                        key={feature.title}
                        className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-200 dark:hover:border-blue-500/30 transition"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                            <IconComponent className="w-5 h-5 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{feature.title}</h3>
                        <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                )})}
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-8 text-center">
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">
                    Ви переглядаєте демо-режим. Увійдіть, щоб розпочати роботу зі своїми даними.
                </p>
                <button
                    onClick={() => openSignIn()}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                    Увійти зараз →
                </button>
            </div>
        </div>
    )
}

export default GuestLanding
