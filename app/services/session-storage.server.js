import { Session } from "@shopify/shopify-api";
import connectDB from "../db.server";
import SessionModel from "../models/session.server";

// Hand-rolled implementation of Shopify's SessionStorage interface, backed
// by the Session mongoose model. Mirrors the official Prisma adapter's
// row <-> Session conversion, but keeps everything in one readable file.
export class MongooseSessionStorage {
  async storeSession(session) {
    await connectDB();
    const doc = this.sessionToDoc(session);
    await SessionModel.findByIdAndUpdate(session.id, doc, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    return true;
  }

  async loadSession(id) {
    await connectDB();
    const doc = await SessionModel.findById(id).lean();
    if (!doc) return undefined;
    return this.docToSession(doc);
  }

  async deleteSession(id) {
    await connectDB();
    await SessionModel.deleteOne({ _id: id });
    return true;
  }

  async deleteSessions(ids) {
    await connectDB();
    await SessionModel.deleteMany({ _id: { $in: ids } });
    return true;
  }

  async findSessionsByShop(shop) {
    await connectDB();
    const docs = await SessionModel.find({ shop })
      .sort({ expires: -1 })
      .limit(25)
      .lean();
    return docs.map((doc) => this.docToSession(doc));
  }

  sessionToDoc(session) {
    const params = session.toObject();
    const user = params.onlineAccessInfo?.associated_user;
    return {
      _id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope || null,
      expires: session.expires || null,
      accessToken: session.accessToken || "",
      userId: user?.id != null ? String(user.id) : null,
      firstName: user?.first_name || null,
      lastName: user?.last_name || null,
      email: user?.email || null,
      accountOwner: user?.account_owner || false,
      locale: user?.locale || null,
      collaborator: user?.collaborator || false,
      emailVerified: user?.email_verified || false,
      refreshToken: params.refreshToken || null,
      refreshTokenExpires: params.refreshTokenExpires || null,
    };
  }

  docToSession(doc) {
    const sessionParams = {
      id: doc._id,
      shop: doc.shop,
      state: doc.state,
      isOnline: doc.isOnline,
    };

    if (doc.userId != null) sessionParams.userId = doc.userId;
    if (doc.firstName) sessionParams.firstName = doc.firstName;
    if (doc.lastName) sessionParams.lastName = doc.lastName;
    if (doc.email) sessionParams.email = doc.email;
    if (doc.locale) sessionParams.locale = doc.locale;
    if (doc.accountOwner != null) sessionParams.accountOwner = doc.accountOwner;
    if (doc.collaborator != null) sessionParams.collaborator = doc.collaborator;
    if (doc.emailVerified != null)
      sessionParams.emailVerified = doc.emailVerified;
    if (doc.expires) sessionParams.expires = doc.expires.getTime();
    if (doc.scope) sessionParams.scope = doc.scope;
    if (doc.accessToken) sessionParams.accessToken = doc.accessToken;
    if (doc.refreshToken) sessionParams.refreshToken = doc.refreshToken;
    if (doc.refreshTokenExpires)
      sessionParams.refreshTokenExpires = doc.refreshTokenExpires.getTime();

    return Session.fromPropertyArray(Object.entries(sessionParams), true);
  }
}
