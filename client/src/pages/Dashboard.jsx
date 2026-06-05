import { Plus, Building2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'
import { useUser, useClerk, useAuth } from '@clerk/clerk-react'
import { useSelector } from 'react-redux'
import GuestLanding from '../components/GuestLanding'
import { useRequireAuth } from '../hooks/useRequireAuth'

const Dashboard = () => {

    const { user } = useUser()
    const { isSignedIn } = useAuth()
    const { openCreateOrganization } = useClerk()
    const { requireAuth } = useRequireAuth()
    const { currentWorkspace, loading, hasFetched } = useSelector((state) => state.workspace)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (!isSignedIn) {
        return <GuestLanding />
    }

    if (!hasFetched || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!currentWorkspace) {
        return (
            <div className='max-w-6xl mx-auto'>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                        <Building2 className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                        У вас ще немає воркспейсів
                    </h2>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-md mb-8">
                        Створіть воркспейс, щоб почати керувати проєктами, завданнями та командою.
                    </p>
                    <button
                        onClick={() => openCreateOrganization()}
                        className="flex items-center gap-2 px-8 py-3 text-sm font-medium rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition"
                    >
                        <Plus size={18} />
                        Створити перший воркспейс
                    </button>
                </div>
            </div>
        )
    }

    return ( 
        <div className='max-w-6xl mx-auto'>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Welcome back, {user?.fullName || 'User'} </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Here's what's happening with your projects today </p>
                </div>

                <button onClick={() => requireAuth(() => setIsDialogOpen(true))} className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white space-x-2 hover:opacity-90 transition" >
                    <Plus size={16} /> New Project
                </button>

                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            <StatsGrid />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ProjectOverview />
                    <RecentActivity />
                </div>
                <div>
                    <TasksSummary />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
