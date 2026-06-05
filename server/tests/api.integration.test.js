// tests/api.integration.test.js — інтеграційне тестування API (supertest)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('@clerk/express', () => ({
    clerkMiddleware: () => (_req, _res, next) => next(),
}));

vi.mock('inngest/express', () => ({
    serve: () => (_req, res) => res.status(200).json({ ok: true }),
}));

vi.mock('../inngest/index.js', () => ({
    inngest: {
        id: 'project-management',
        send: vi.fn().mockResolvedValue({ ids: ['evt-1'] }),
    },
    functions: [],
}));

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

vi.mock('../middlewares/authMiddleware.js', () => ({
    protect: vi.fn(async (req, res, next) => {
        if (req.headers['x-test-unauthorized']) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.auth = vi.fn().mockResolvedValue({ userId: 'test-user-lead' });
        next();
    }),
}));

import app from '../app.js';
import prisma from '../configs/prisma.js';

const TEAM_LEAD = 'test-user-lead';

describe('REST API — інтеграційні тести', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /', () => {
        it('повертає 200 та текст перевірки сервера', async () => {
            const res = await request(app).get('/');

            expect(res.status).toBe(200);
            expect(res.text).toBe('Server is live!');
        });
    });

    describe('POST /api/tasks', () => {
        it('повертає 200 і створене завдання для авторизованого запиту', async () => {
            const created = { id: 'new-task', title: 'Нове завдання', projectId: 'project-123' };
            const withAssignee = { ...created, assignee: { email: 'a@test.com' } };

            prisma.project.findUnique.mockResolvedValue({
                id: 'project-123',
                team_lead: TEAM_LEAD,
                members: [{ user: { id: 'assignee-1' } }],
            });
            prisma.task.create.mockResolvedValue(created);
            prisma.task.findUnique.mockResolvedValue(withAssignee);

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake-token')
                .send({
                    projectId: 'project-123',
                    title: 'Нове завдання',
                    assigneeId: 'assignee-1',
                    due_date: '2025-12-31',
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('task');
            expect(res.body.task).toHaveProperty('id', 'new-task');
            expect(res.body).toHaveProperty('message', 'Task created successfully');
        });
    });

    describe('POST /api/tasks/delete', () => {
        it('повертає 200 та повідомлення про успішне видалення', async () => {
            prisma.task.findMany.mockResolvedValue([
                { id: 'task-1', projectId: 'project-123' },
            ]);
            prisma.project.findUnique.mockResolvedValue({
                id: 'project-123',
                team_lead: TEAM_LEAD,
                members: [],
            });
            prisma.task.deleteMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/api/tasks/delete')
                .set('Authorization', 'Bearer fake-token')
                .send({ tasksIds: ['task-1'] });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Task deleted successfully' });
        });
    });

    describe('Захист маршрутів', () => {
        it('повертає 401 для неавторизованого запиту', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('x-test-unauthorized', '1')
                .send({ title: 'X', projectId: 'p1' });

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ message: 'Unauthorized' });
        });
    });
});
