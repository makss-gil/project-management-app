import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces', 
    async ({getToken}) => {
        try {
            const {data} = await api.get('/api/workspaces', {headers: {Authorization: `Bearer ${await getToken()}`}})
            return data.workspaces || []
        } catch (error) {
            console.log(error?.response?.data?.message || error.message)
            return []
        }
});

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
    hasFetched: false,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);

            // Встановити новий воркспейс як поточний
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );

            // Оновити поточний воркспейс, якщо він був змінений
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
        },
        addProject: (state, action) => {
            state.currentWorkspace.projects.push(action.payload);
            // Знайти воркспейс за id і додати проєкт
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? { ...w, projects: w.projects.concat(action.payload) } : w
            );
        },
        addTask: (state, action) => {

            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks.push(action.payload);
                }
                return p;
            });

            // Знайти воркспейс і проєкт за id та додати завдання
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? { ...p, tasks: p.tasks.concat(action.payload) } : p
                    )
                } : w
            );
        },
        updateTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                    );
                }
            });
            // Знайти воркспейс і проєкт за id та оновити завдання
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p, tasks: p.tasks.map((t) =>
                                t.id === action.payload.id ? action.payload : t
                            )
                        } : p
                    )
                } : w
            );
        },
        deleteTask: (state, action) => {
            const tasksIds = action.payload;
            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => ({
                ...p,
                tasks: p.tasks.filter((t) => !tasksIds.includes(t.id)),
            }));
            // Знайти воркспейс і видалити завдання з усіх проєктів
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) => ({
                        ...p,
                        tasks: p.tasks.filter((t) => !tasksIds.includes(t.id)),
                    }))
                } : w
            );
        }

    },
    extraReducers: (builder)=>{
        builder.addCase(fetchWorkspaces.pending, (state)=>{
            state.loading = true
        });
        builder.addCase(fetchWorkspaces.fulfilled, (state, action)=>{
            state.workspaces = action.payload;
            if(action.payload.length > 0){
                const localStorageCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
                if(localStorageCurrentWorkspaceId){
                    const findWorkspace = action.payload.find((w)=> w.id === localStorageCurrentWorkspaceId);
                    if(findWorkspace){
                        state.currentWorkspace = findWorkspace
                    }else{
                        state.currentWorkspace = action.payload[0]
                    }
                }else{ 
                    state.currentWorkspace = action.payload[0]
                }
            }
            state.loading = false;
            state.hasFetched = true;
        });
        builder.addCase(fetchWorkspaces.rejected, (state)=>{
            state.loading = false;
            state.hasFetched = true;
        });
    }
});

export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;