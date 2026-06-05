// tests/syncClerkUser.test.js — тести синхронізації Clerk → PostgreSQL

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../configs/prisma.js', () => ({
    default: {
        user: {
            create: vi.fn(),
        },
    },
}));

import prisma from '../configs/prisma.js';
import {
    handleUserCreated,
    buildClerkDisplayName,
} from '../inngest/handlers/clerkUser.js';

describe('buildClerkDisplayName', () => {
    it("об'єднує ім'я та прізвище", () => {
        expect(buildClerkDisplayName('Іван', 'Петренко')).toBe('Іван Петренко');
    });

    it('повертає лише ім\'я, якщо прізвище відсутнє', () => {
        expect(buildClerkDisplayName('Олег', null)).toBe('Олег');
    });
});

describe('syncClerkUser — обробник clerk/user.created', () => {
    beforeEach(() => vi.clearAllMocks());

    it('створює запис користувача з коректними даними', async () => {
        prisma.user.create.mockResolvedValue({
            id: 'clerk-user-123',
            email: 'test@example.com',
        });

        const result = await handleUserCreated({
            id: 'clerk-user-123',
            email_addresses: [{ email_address: 'test@example.com' }],
            first_name: 'Іван',
            last_name: 'Петренко',
            image_url: 'https://example.com/avatar.jpg',
        });

        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                id: 'clerk-user-123',
                email: 'test@example.com',
                name: 'Іван Петренко',
                image: 'https://example.com/avatar.jpg',
            },
        });
        expect(result).toEqual({ success: true, userId: 'clerk-user-123' });
    });

    it("коректно формує ім'я з імені та прізвища", async () => {
        prisma.user.create.mockResolvedValue({});

        await handleUserCreated({
            id: 'user-abc',
            email_addresses: [{ email_address: 'a@b.com' }],
            first_name: 'Марія',
            last_name: 'Коваль',
            image_url: null,
        });

        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ name: 'Марія Коваль' }),
            })
        );
    });

    it('обробляє відсутність прізвища коректно', async () => {
        prisma.user.create.mockResolvedValue({});

        await handleUserCreated({
            id: 'user-xyz',
            email_addresses: [{ email_address: 'mono@test.com' }],
            first_name: 'Олег',
            last_name: null,
            image_url: null,
        });

        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ name: 'Олег', image: '' }),
            })
        );
    });
});
