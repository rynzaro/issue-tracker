import { createErrorResponse } from "@/lib/util";
import client from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import bcrypt from "bcrypt";

const Params = z.object({
  email: z.string().email("Email must be valid"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateAccountParams = z.infer<typeof Params>;
export type CreateAccountResponse = {
  id: string;
  email: string;
};

export async function POST(request: NextRequest) {
  const { data: params, error } = Params.safeParse(await request.json());

  if (error) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(
      createErrorResponse(
        "ZOD_VALIDATION_ERROR",
        "Input validation failed",
        details,
      ),
      { status: 400 },
    );
  }

  try {
    // TODO: Implement account creation logic with Prisma
    const emailAlreadyRegistered = await client.user.findUnique({
      where: {
        email: params.email,
      },
    });
    if (emailAlreadyRegistered) {
      return NextResponse.json(
        createErrorResponse(
          // do not leak information about existing accounts in the error message
          "INTERNAL_SERVER_ERROR",
          "email already registered",
        ),
        { status: 500 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.email)) {
      return NextResponse.json(
        createErrorResponse("INPUT_FORMAT_ERROR", "Email format is invalid"),
        { status: 400 },
      );
    }

    const user = await client.user.create({
      data: {
        email: params.email,
        password: bcrypt.hashSync(params.password, 12),
      },
      select: {
        id: true,
        email: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        "INTERNAL_SERVER_ERROR",
        "Failed to create account",
        error instanceof Error ? error.message : "Unknown error",
      ),
      { status: 500 },
    );
  }
}
