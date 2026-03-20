import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: (config: ConfigService): admin.app.App => {
        if (admin.apps.length > 0) return admin.app();
        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.get<string>('FIREBASE_PROJECT_ID'),
            clientEmail: config.get<string>('FIREBASE_CLIENT_EMAIL'),
            privateKey: config
              .get<string>('FIREBASE_PRIVATE_KEY')!
              .replace(/\\n/g, '\n'),
          }),
        });
      },
      inject: [ConfigService],
    },
    FirebaseService,
  ],
  exports: [FirebaseService],
})
export class FirebaseModule {}
