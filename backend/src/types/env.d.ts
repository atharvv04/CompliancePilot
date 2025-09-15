declare namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET?: string;
      MINIO_BUCKET?: string;
      // add other env keys you read in code, e.g. DB_URL, MINIO_* …
    }
  }
  