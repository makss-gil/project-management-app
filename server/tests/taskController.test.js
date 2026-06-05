// tests/taskController.test.js — модульні тести TaskController
// Відповідає server/controllers/taskController.js

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../configs/prisma.js', () => ({
    default: {
        task: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            deleteMany: vi.fn(),
        },
        project: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../inngest/index.js', () => ({
    inngest: {
        send: vi.fn().mockResolvedValue({ ids: ['test-event'] }),
    },
}));

import prisma from '../configs/prisma.js';
import { inngest } from '../inngest/index.js';
import { createTask, updateTask, deleteTask } from '../controllers/taskController.js';

const TEAM_LEAD_ID = 'user-lead-1';
const OTHER_USER_ID = 'user-other-2';

const mockProject = (overrides = {}) => ({
    id: 'project-123',
    team_lead: TEAM_LEAD_ID,
    members: [{ user: { id: 'user-assignee-1' } }],
    ...overrides,
});

const mockReq = ({ body = {}, params = {}, userId = TEAM_LEAD_ID, origin = 'http://localhost:5173' } = {}) => ({
    auth: vi.fn().mockResolvedValue({ userId }),
    body,
    params,
    get: vi.fn().mockReturnValue(origin),
});

const mockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('createTask', () => {
    beforeEach(() => vi.clearAllMocks());

    it('створює завдання, надсилає подію Inngest і повертає task з assignee', async () => {
        const created = { id: 'task-1', title: 'Тестове завдання', projectId: 'project-123' };
        const withAssignee = { ...created, assignee: { id: 'user-assignee-1', email: 'a@test.com' } };

        prisma.project.findUnique.mockResolvedValue(mockProject());
        prisma.task.create.mockResolvedValue(created);
        prisma.task.findUnique.mockResolvedValue(withAssignee);

        const req = mockReq({
            body: {
                projectId: 'project-123',
                title: 'Тестове завдання',
                description: 'Опис',
                type: 'TASK',
                status: 'TODO',
                priority: 'HIGH',
                assigneeId: 'user-assignee-1',
                due_date: '2025-12-31',
            },
        });
        const res = mockRes();

        await createTask(req, res);

        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: 'project-123' },
            include: { members: { include: { user: true } } },
        });

        expect(prisma.task.create).toHaveBeenCalledWith({
            data: {
                projectId: 'project-123',
                title: 'Тестове завдання',
                description: 'Опис',
                type: 'TASK',
                status: 'TODO',
                priority: 'HIGH',
                assigneeId: 'user-assignee-1',
                due_date: new Date('2025-12-31'),
            },
        });

        expect(inngest.send).toHaveBeenCalledWith({
            name: 'app/task.assigned',
            data: { taskId: 'task-1', origin: 'http://localhost:5173' },
        });

        expect(res.json).toHaveBeenCalledWith({
            task: withAssignee,
            message: 'Task created successfully',
        });
    });

    it('повертає 404, якщо проєкт не знайдено', async () => {
        prisma.project.findUnique.mockResolvedValue(null);

        const req = mockReq({
            body: { projectId: 'missing', title: 'X', assigneeId: 'u1', due_date: '2025-01-01' },
        });
        const res = mockRes();

        await createTask(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо користувач не team_lead проєкту', async () => {
        prisma.project.findUnique.mockResolvedValue(mockProject());

        const req = mockReq({
            userId: OTHER_USER_ID,
            body: { projectId: 'project-123', title: 'X', assigneeId: 'user-assignee-1', due_date: '2025-01-01' },
        });
        const res = mockRes();

        await createTask(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: "You don't have admin privileges for this project",
        });
        expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо assignee не є учасником проєкту', async () => {
        prisma.project.findUnique.mockResolvedValue(mockProject());

        const req = mockReq({
            body: {
                projectId: 'project-123',
                title: 'X',
                assigneeId: 'unknown-user',
                due_date: '2025-01-01',
            },
        });
        const res = mockRes();

        await createTask(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: 'assignee is not a member of the project / workspace',
        });
        expect(prisma.task.create).not.toHaveBeenCalled();
    });
});

describe('updateTask', () => {
    beforeEach(() => vi.clearAllMocks());

    it('оновлює завдання, якщо користувач — team_lead', async () => {
        const existing = { id: 'task-1', projectId: 'project-123' };
        const updated = { ...existing, status: 'DONE', title: 'Оновлено' };

        prisma.task.findUnique.mockResolvedValue(existing);
        prisma.project.findUnique.mockResolvedValue(mockProject());
        prisma.task.update.mockResolvedValue(updated);

        const req = mockReq({
            params: { id: 'task-1' },
            body: { status: 'DONE', title: 'Оновлено' },
        });
        const res = mockRes();

        await updateTask(req, res);

        expect(prisma.task.update).toHaveBeenCalledWith({
            where: { id: 'task-1' },
            data: { status: 'DONE', title: 'Оновлено' },
        });
        expect(res.json).toHaveBeenCalledWith({
            message: 'Task updated successfully',
            task: updated,
        });
    });

    it('повертає 404, якщо завдання не існує', async () => {
        prisma.task.findUnique.mockResolvedValue(null);

        const req = mockReq({ params: { id: 'missing' }, body: { status: 'DONE' } });
        const res = mockRes();

        await updateTask(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
        expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо користувач не team_lead', async () => {
        prisma.task.findUnique.mockResolvedValue({ id: 'task-1', projectId: 'project-123' });
        prisma.project.findUnique.mockResolvedValue(mockProject());

        const req = mockReq({
            userId: OTHER_USER_ID,
            params: { id: 'task-1' },
            body: { status: 'DONE' },
        });
        const res = mockRes();

        await updateTask(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(prisma.task.update).not.toHaveBeenCalled();
    });
});

describe('deleteTask', () => {
    beforeEach(() => vi.clearAllMocks());

    it('видаляє завдання за масивом tasksIds', async () => {
        const tasks = [{ id: 'task-1', projectId: 'project-123' }];

        prisma.task.findMany.mockResolvedValue(tasks);
        prisma.project.findUnique.mockResolvedValue(mockProject());
        prisma.task.deleteMany.mockResolvedValue({ count: 1 });

        const req = mockReq({ body: { tasksIds: ['task-1'] } });
        const res = mockRes();

        await deleteTask(req, res);

        expect(prisma.task.findMany).toHaveBeenCalledWith({
            where: { id: { in: ['task-1'] } },
        });
        expect(prisma.task.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ['task-1'] } },
        });
        expect(res.json).toHaveBeenCalledWith({ message: 'Task deleted successfully' });
    });

    it('повертає 404, якщо завдань за ids не знайдено', async () => {
        prisma.task.findMany.mockResolvedValue([]);

        const req = mockReq({ body: { tasksIds: ['missing'] } });
        const res = mockRes();

        await deleteTask(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
        expect(prisma.task.deleteMany).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо користувач не team_lead', async () => {
        prisma.task.findMany.mockResolvedValue([{ id: 'task-1', projectId: 'project-123' }]);
        prisma.project.findUnique.mockResolvedValue(mockProject());

        const req = mockReq({
            userId: OTHER_USER_ID,
            body: { tasksIds: ['task-1'] },
        });
        const res = mockRes();

        await deleteTask(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(prisma.task.deleteMany).not.toHaveBeenCalled();
    });
});
