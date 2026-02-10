import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/IssueCollaboration";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

// Simulated email service - in production use nodemailer or SendGrid
async function sendEmail(
  recipient: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    // TODO: Integrate with actual email service (nodemailer, SendGrid, etc.)
    console.log(`[EMAIL] To: ${recipient}, Subject: ${subject}`);
    return true;
  } catch (err) {
    console.error("[sendEmail] error:", err);
    return false;
  }
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<boolean> {
  try {
    // TODO: Integrate with Firebase Cloud Messaging or Apple Push Notification service
    console.log(`[PUSH] UserId: ${userId}, Title: ${title}`);
    return true;
  } catch (err) {
    console.error("[sendPushNotification] error:", err);
    return false;
  }
}

async function sendSlackMessage(
  channel: string,
  message: string
): Promise<boolean> {
  try {
    // TODO: Integrate with Slack webhook
    console.log(`[SLACK] Channel: ${channel}, Message: ${message}`);
    return true;
  } catch (err) {
    console.error("[sendSlackMessage] error:", err);
    return false;
  }
}

/**
 * POST: Create and send notification
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      recipientId?: string;
      recipientIds?: string[];
      type: string;
      title: string;
      message: string;
      channels: string[]; // "email", "in_app", "push", "slack"
      relatedIssue?: string;
      metadata?: Record<string, any>;
    };

    if (!body.type || !body.title || !body.message) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const recipients = body.recipientIds || (body.recipientId ? [body.recipientId] : []);
    if (recipients.length === 0) {
      return NextResponse.json(
        errorResp("No recipients specified"),
        { status: 400 }
      );
    }

    const createdNotifications = [];
    const notificationChannels = body.channels || ["in_app"];

    for (const recipientId of recipients) {
      const recipient = await User.findById(recipientId);
      if (!recipient) continue;

      // Create in-app notification record
      const notif = await Notification.create({
        recipient: recipientId,
        type: body.type,
        title: body.title,
        message: body.message,
        channel: notificationChannels,
        relatedIssue: body.relatedIssue,
        metadata: body.metadata,
        isRead: false
      });

      createdNotifications.push(notif._id.toString());

      // Send to other channels
      if (notificationChannels.includes("email")) {
        await sendEmail(recipient.email, body.title, body.message);
      }

      if (notificationChannels.includes("push")) {
        await sendPushNotification(recipientId, body.title, body.message);
      }

      if (notificationChannels.includes("slack")) {
        if (recipient.slackUserId) {
          await sendSlackMessage(recipient.slackUserId, `${body.title}: ${body.message}`);
        }
      }
    }

    return NextResponse.json(
      successResp("Notifications sent", {
        count: createdNotifications.length,
        notificationIds: createdNotifications
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/notifications/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to send notifications", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve notifications for current user
 */
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const query: any = { recipient: payload.sub };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate("relatedIssue", "key summary")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: payload.sub,
      isRead: false
    });

    return NextResponse.json(
      successResp("Notifications retrieved", {
        notifications: notifications.map((n: any) => ({
          id: n._id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          relatedIssue: n.relatedIssue,
          createdAt: n.createdAt
        })),
        unreadCount
      })
    );
  } catch (err: any) {
    console.error("[jira/notifications/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve notifications", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * PUT: Mark notifications as read
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      notificationIds?: string[];
      markAllAsRead?: boolean;
    };

    if (body.markAllAsRead) {
      // Mark all notifications as read for this user
      await Notification.updateMany(
        { recipient: payload.sub, isRead: false },
        { isRead: true }
      );
    } else if (body.notificationIds?.length) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: body.notificationIds }, recipient: payload.sub },
        { isRead: true }
      );
    }

    return NextResponse.json(
      successResp("Notifications marked as read")
    );
  } catch (err: any) {
    console.error("[jira/notifications/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update notifications", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete notifications
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      notificationIds?: string[];
      deleteAll?: boolean;
    };

    if (body.deleteAll) {
      await Notification.deleteMany({ recipient: payload.sub });
    } else if (body.notificationIds?.length) {
      await Notification.deleteMany({
        _id: { $in: body.notificationIds },
        recipient: payload.sub
      });
    }

    return NextResponse.json(
      successResp("Notifications deleted")
    );
  } catch (err: any) {
    console.error("[jira/notifications/DELETE] error:", err);
    return NextResponse.json(
      errorResp("Failed to delete notifications", err?.message || err),
      { status: 500 }
    );
  }
}
