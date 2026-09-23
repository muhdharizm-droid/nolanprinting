import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "owner") {
      // Admin sees complete staff roster
      const staffList = await db.user.findMany({
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          phoneNumber: true,
          gender: true,
          race: true,
          address: true,
          createdAt: true,
          _count: { select: { sales: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, staff: staffList, isSelfOnly: false });
    } else {
      // Cashier and Stock Manager can only access their personal profile details
      const self = await db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          phoneNumber: true,
          gender: true,
          race: true,
          address: true,
          createdAt: true,
          _count: { select: { sales: true } },
        },
      });

      return NextResponse.json({
        success: true,
        staff: self ? [self] : [],
        isSelfOnly: true,
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admin can create staff accounts." }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, fullName, role, phoneNumber, gender, race, address } = body;

    if (!username?.trim() || !password || !fullName?.trim() || !role) {
      return NextResponse.json({ success: false, message: "Required fields missing." }, { status: 400 });
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      return NextResponse.json({ success: false, message: "Password must be at least 4 characters long." }, { status: 400 });
    }

    const existing = await db.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: "insensitive" },
      },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Username already taken." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(cleanPassword);
    const newStaff = await db.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        fullName: fullName.trim(),
        role,
        phoneNumber: phoneNumber?.trim() || "",
        gender: gender || "Male",
        race: race || "Malay",
        address: address?.trim() || "",
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        phoneNumber: true,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Staff Created",
        details: `Admin created staff user '${newStaff.fullName}' (${newStaff.role})`,
      },
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to create staff" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, username, fullName, role, phoneNumber, gender, race, address, password } = body;

    const targetId = parseInt(id || user.id, 10);

    // If not Admin (owner): Can ONLY edit their own personal details!
    if (user.role !== "owner") {
      if (targetId !== user.id) {
        return NextResponse.json({
          success: false,
          message: "Forbidden: You can only edit your own personal details.",
        }, { status: 403 });
      }

      const updateData: any = {};
      if (fullName?.trim()) updateData.fullName = fullName.trim();
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber?.trim() || "";
      if (gender !== undefined) updateData.gender = gender;
      if (race !== undefined) updateData.race = race;
      if (address !== undefined) updateData.address = address?.trim() || "";
      if (password !== undefined && password !== null && typeof password === "string" && password.trim().length > 0) {
        const cleanPass = password.trim();
        if (cleanPass.length < 4) {
          return NextResponse.json({ success: false, message: "Password must be at least 4 characters long." }, { status: 400 });
        }
        updateData.password = await hashPassword(cleanPass);
      }

      const updated = await db.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          phoneNumber: true,
          gender: true,
          race: true,
          address: true,
        },
      });

      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Profile Updated",
          details: `Staff member '${updated.fullName}' updated their personal details.`,
        },
      });

      return NextResponse.json({ success: true, staff: updated, message: "Profile updated successfully." });
    }

    // Admin (owner) can update any staff user
    const existing = await db.user.findUnique({ where: { id: targetId } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Staff user not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName?.trim()) updateData.fullName = fullName.trim();
    if (username && username.trim() !== existing.username) {
      const duplicate = await db.user.findUnique({ where: { username: username.trim() } });
      if (duplicate) {
        return NextResponse.json({ success: false, message: "Username already taken." }, { status: 400 });
      }
      updateData.username = username.trim();
    }
    if (role && ["owner", "cashier", "stock_handler"].includes(role)) {
      updateData.role = role;
    }
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber?.trim() || "";
    if (gender !== undefined) updateData.gender = gender;
    if (race !== undefined) updateData.race = race;
    if (address !== undefined) updateData.address = address?.trim() || "";

    let passwordChanged = false;
    if (password !== undefined && password !== null && typeof password === "string" && password.trim().length > 0) {
      const cleanPass = password.trim();
      if (cleanPass.length < 4) {
        return NextResponse.json({ success: false, message: "New password must be at least 4 characters long." }, { status: 400 });
      }
      updateData.password = await hashPassword(cleanPass);
      passwordChanged = true;
    }

    const updated = await db.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        gender: true,
        race: true,
        address: true,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: passwordChanged ? "Staff Password Reset" : "Staff Updated",
        details: passwordChanged
          ? `Admin reset password and updated profile for '${updated.fullName}' (@${updated.username}).`
          : `Admin updated staff member '${updated.fullName}' (${updated.role}).`,
      },
    });

    return NextResponse.json({
      success: true,
      staff: updated,
      passwordReset: passwordChanged,
      message: passwordChanged
        ? `Password for '${updated.fullName}' (@${updated.username}) has been successfully reset.`
        : `Staff details for '${updated.fullName}' updated successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admin can delete staff." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Staff ID required." }, { status: 400 });
    }

    const targetId = parseInt(id, 10);
    if (targetId === user.id) {
      return NextResponse.json({ success: false, message: "Cannot delete your own admin account." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id: targetId } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Staff user not found." }, { status: 404 });
    }

    await db.user.delete({ where: { id: targetId } });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Staff Deleted",
        details: `Admin removed staff account '${existing.fullName}' (@${existing.username}).`,
      },
    });

    return NextResponse.json({ success: true, message: "Staff account deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to delete staff" }, { status: 500 });
  }
}
