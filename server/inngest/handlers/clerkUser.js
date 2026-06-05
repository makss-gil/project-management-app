import prisma from '../../configs/prisma.js';

/** Формує відображуване ім'я з полів Clerk (без зайвих пробілів). */
export function buildClerkDisplayName(firstName, lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Створює користувача в PostgreSQL за даними події clerk/user.created.
 * @param {object} data — payload Clerk (event.data)
 * @param {import('@prisma/client').PrismaClient} [db]
 */
export async function handleUserCreated(data, db = prisma) {
    const email = data?.email_addresses?.[0]?.email_address;
    const name = buildClerkDisplayName(data?.first_name, data?.last_name);

    await db.user.create({
        data: {
            id: data.id,
            email,
            name,
            image: data?.image_url ?? '',
        },
    });

    return { success: true, userId: data.id };
}
