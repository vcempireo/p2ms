import { App } from 'firebase-admin/app';

// APIルート（サーバーサイド）専用のFirebase Admin SDK
// このファイルをクライアントコンポーネントからimportしてはいけない
// ビルド時に初期化しないよう、実行時に遅延初期化する

let adminApp: App | null = null;

const getAdminApp = async (): Promise<App> => {
  if (adminApp) return adminApp;

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Vercelの環境変数では FIREBASE_PRIVATE_KEY の改行が \n として保存される
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
};

/** Admin Firestore インスタンスを取得（APIルート内で呼ぶ） */
export const getAdminDb = async () => {
  const app = await getAdminApp();
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(app);
};

/** Admin Storage インスタンスを取得（APIルート内で呼ぶ） */
export const getAdminStorage = async () => {
  const app = await getAdminApp();
  const { getStorage } = await import('firebase-admin/storage');
  return getStorage(app);
};

/** Admin Auth インスタンスを取得（IDトークン検証用） */
export const getAdminAuth = async () => {
  const app = await getAdminApp();
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(app);
};

/**
 * リクエストヘッダーのBearerトークンを検証してuidを返す
 * 認証失敗時はnullを返す
 */
export const verifyAuthToken = async (req: { headers: { get: (key: string) => string | null } }) => {
  const authHeader = req.headers.get('Authorization');
  const idToken = authHeader?.replace('Bearer ', '');
  if (!idToken) return null;

  const adminAuth = await getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
};
