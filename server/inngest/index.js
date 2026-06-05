import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";
import { handleUserCreated, buildClerkDisplayName } from "./handlers/clerkUser.js";

// Клієнт Inngest для надсилання та отримання подій
export const inngest = new Inngest({ id: "project-management" });

// Збереження даних користувача в базі даних
const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        await handleUserCreated(event.data);
    }
)

// Видалення користувача з бази даних
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event
        await prisma.user.delete({
            where: {
                id: data.id,
            }
        })
    }
)

// Оновлення даних користувача в базі даних
const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { data } = event
        await prisma.user.update({
            where: {
                id: data.id
            },
            data: {
                email: data?.email_addresses?.[0]?.email_address,
                name: buildClerkDisplayName(data?.first_name, data?.last_name),
                image: data?.image_url ?? '',
            }
        })
    }
)

// Синхронізація при створенні нової організації (workspace)
const syncWorkspaceCreation = inngest.createFunction(
    { id: 'sync-workspace-from-clerk' },
    { event: 'clerk/organization.created'},
    async ({ event }) => {
        const { data } = event;
        // Крок 1: створення запису workspace у локальній БД
        await prisma.workspace.create({
            data: {
                id: data.id,             // Clerk Organization ID
                name: data.name,
                slug: data.slug,         // унікальний URL-рядок
                ownerId: data.created_by,// Clerk User ID творця
                image_url: data.image_url ?? '',

            }
        })

        // Крок 2: автоматичне додавання творця як адміністратора
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"          // творець завжди отримує роль адміністратора
            }
        })
    }
)

// Оновлення даних workspace в базі даних
const syncWorkspaceUpdation = inngest.createFunction(
    { id: 'update-workspace-from-clerk' },
    { event: 'clerk/organization.updated' },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.update({
            where: {
                id: data.id
            },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url ?? '',
            }
        })

    }
)

// Видалення workspace з бази даних
const syncWorkspaceDeletion = inngest.createFunction(
    { id: 'delete-workspace-with-clerk' },
    { event: 'clerk/organization.deleted' },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.delete({
            where: {
                id: data.id
            }
        })
    }
)

// Додавання нового учасника при прийнятті запрошення
const syncWorkspaceMemberCreation = inngest.createFunction(
    { id: 'sync-workspace-member-from-clerk' },
    { event: 'clerk/organizationInvitation.accepted' },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId: data.organization_id,
                // Clerk передає назву ролі у нижньому регістрі
                // (напр. "admin"), тому перетворюємо у верхній ("ADMIN")
                role: String(data.role_name).toUpperCase()

            }
        })

    }
)

// Надсилання email при призначенні завдання
const sendTaskAssignmentEmail = inngest.createFunction(
    { id: "send-task-assignment-mail" },
    { event: "app/task.assigned" },
    async ({ event, step }) => {
        const { taskId, origin } = event.data;

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignee: true, project: true }
        })

        if (!task || !task.assignee) return;

        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assignment in ${task.project.name}`,
            body: `<div style="max-width: 600px;">
                <h2>Hi ${task.assignee.name}, 👋</h2>

                <p style="font-size: 16px;">You've been assigned a new task:</p>
                <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>

                <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                    <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
                    <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
                </div>

                <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                    View Task
                </a>

                <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                    Please make sure to review and complete it before the due date.
                </p>
            </div>`
        })
        if (new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()) {
            await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));

            await step.run('check-if-task-is-completed', async () => {
                const refreshedTask = await prisma.task.findUnique({
                    where: { id: taskId },
                    include: { assignee: true, project: true }
                })

                if (!refreshedTask || !refreshedTask.assignee) return;

                if (refreshedTask.status !== "DONE") {
                    await step.run('send-task-reminder-mail',
                        async () => {
                            await sendEmail({
                                to: refreshedTask.assignee.email,
                                subject: `Reminder for ${refreshedTask.project.name}`,
                                body: ` <div style="max-width: 600px;">
                                        <h2>Hi ${refreshedTask.assignee.name}, 👋</h2>

                                        <p style="font-size: 16px;">You have a task due in ${refreshedTask.project.name}:</p>
                                        <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${refreshedTask.title}</p>

                                        <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                                            <p style="margin: 6px 0;"><strong>Description:</strong> ${refreshedTask.description}</p>
                                            <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(refreshedTask.due_date).toLocaleDateString()}</p>
                                        </div>

                                        <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                                            View Task
                                        </a>

                                        <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                                            Please make sure to review and complete it before the due date.
                                        </p>
                                    </div>`
                            })
                        }
                    )
                }
            })
        }
    }
)

// Експорт усіх Inngest-функцій
export const functions = [

    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,

    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,
    syncWorkspaceMemberCreation,
    sendTaskAssignmentEmail
];
