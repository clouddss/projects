import { Routes } from '@angular/router';
import { SignUpComponent } from './sign-up/sign-up.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './core/services/auth/auth.guard';
import { RedirectAuthenticatedGuard } from './core/services/auth/redirect-authenticated.guard';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { PostSectionComponent } from './post-section/post-section.component';
import { CreatePostComponent } from './create-post/create-post.component';
import { ROUTES } from './core/constants/routes.constant';
import { ProfileComponent } from './profile/profile.component';
import { MessageComponent } from './message/message.component';
import { SubcribedAccountSectionComponent } from './subcribed-account-section/subcribed-account-section.component';
import { TransactionComponent } from './transaction/transaction.component';
import { SetSubscriptiomPlanComponent } from './set-subscriptiom-plan/set-subscriptiom-plan.component';
import { RaiseWithdrawlRequestComponent } from './raise-withdrawl-request/raise-withdrawl-request.component';
import { SuccessComponent } from './shared/components/success/success.component';
import { FailedComponent } from './shared/components/failed/failed.component';
import { StaticProfile } from './static-profile/static-profile.component';
import { removeSlashFromRouteName } from './shared/utils/common.functions';
import { SuggestionMobileComponent } from './suggestion-mobile/suggestion-mobile.component';
import { ContactSupportComponent } from './contact-support/contact-support.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsOfServicesComponent } from './terms-of-services/terms-of-services.component';
import { ReferralDashboardComponent } from './referral-dashboard/referral-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    pathMatch: 'full',
    canActivate: [RedirectAuthenticatedGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.LOGIN),
    component: LoginComponent,
    canActivate: [RedirectAuthenticatedGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.SIGNUP),
    component: SignUpComponent,
    canActivate: [RedirectAuthenticatedGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.RESET_PASSWORD),
    component: ResetPasswordComponent,
  },
  {
    path: removeSlashFromRouteName(ROUTES.POSTS),
    component: PostSectionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.CREATE_POSTS),
    component: CreatePostComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.INBOX),
    component: MessageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${removeSlashFromRouteName(ROUTES.INBOX)}/:chatRoomId`,
    component: MessageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.SUBSCRIBED_ACCOUNT),
    component: SubcribedAccountSectionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.YOUR_TRANSACTIONS),
    component: TransactionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.PROFILE),
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${removeSlashFromRouteName(ROUTES.PROFILE)}/:id`,
    component: StaticProfile,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.SET_SUBSCRIPTION_PLAN),
    component: SetSubscriptiomPlanComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.RAISE_WITHDRWAL_REQUEST),
    component: RaiseWithdrawlRequestComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.SUCCESS),
    component: SuccessComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.FAILED),
    component: FailedComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.TOP_CREATORS),
    component: SuggestionMobileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.PRIVACY_POLICY),
    component: PrivacyPolicyComponent,
  },
  {
    path: removeSlashFromRouteName(ROUTES.TERMS_AND_CONDITIONS),
    component: TermsOfServicesComponent,
  },
  {
    path: removeSlashFromRouteName(ROUTES.CONTACT_SUPPORT),
    component: ContactSupportComponent,
    canActivate: [AuthGuard],
  },
  {
    path: removeSlashFromRouteName(ROUTES.REFERRAL_DASHBOARD),
    component: ReferralDashboardComponent,
    canActivate: [AuthGuard],
  },
];
