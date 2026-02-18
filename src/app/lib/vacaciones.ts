import { prisma } from "./prisma";

const buildDayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export type ApprovedLeaveType = "VACACIONES" | "AUSENCIA";

export const getApprovedLeaveType = async (
  userId: string,
  date = new Date(),
): Promise<ApprovedLeaveType | null> => {
  const { start, end } = buildDayRange(date);

  const solicitud = await prisma.solicitud.findFirst({
    where: {
      usuarioId: userId,
      tipo: { in: ["VACACIONES", "AUSENCIA"] },
      estado: "APROBADA",
      OR: [
        {
          fin: null,
          inicio: {
            gte: start,
            lte: end,
          },
        },
        {
          inicio: { lte: end },
          fin: { gte: start },
        },
      ],
    },
    select: { tipo: true },
  });

  return solicitud?.tipo ?? null;
};

export const isOnApprovedVacation = async (userId: string, date = new Date()) => {
  const tipo = await getApprovedLeaveType(userId, date);
  return tipo === "VACACIONES";
};
