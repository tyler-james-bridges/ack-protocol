'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useKudos, type UserData } from '@/lib/useKudos';
import {
  Shield,
  Trash2,
  Lock,
  Unlock,
  CheckCircle
} from 'lucide-react';

interface AccountSettingsProps {
  userData: UserData | null;
  onDataUpdate: () => void;
}

export function AccountSettings({ userData, onDataUpdate }: AccountSettingsProps) {
  const {
    deleteAccountImmediately,
    setProfilePrivacy,
    isPending,
    isSuccess,
    error,
    lastAction
  } = useKudos();

  useEffect(() => {
    if (isSuccess) {
      if (lastAction === 'delete') {
        toast.success('Account deleted successfully');
      } else if (lastAction === 'privacy') {
        toast.success('Privacy settings updated');
      }
      onDataUpdate();
    }
  }, [isSuccess, lastAction, onDataUpdate]);

  useEffect(() => {
    if (error) {
      toast.error(`Operation failed: ${error.message}`);
    }
  }, [error]);

  const handleDeleteImmediately = async () => {
    try {
      await deleteAccountImmediately();
    } catch (err: unknown) {
      toast.error(`Failed to delete account: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      await setProfilePrivacy(!userData?.isPrivate);
    } catch (err: unknown) {
      toast.error(`Failed to update privacy: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!userData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Settings
        </CardTitle>
        <CardDescription>
          Manage your privacy and account settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userData.isPrivate ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Profile Privacy</p>
                <p className="text-sm text-muted-foreground">
                  {userData.isPrivate
                    ? 'Your profile is hidden from public views'
                    : 'Your profile is visible on leaderboards'}
                </p>
              </div>
            </div>
            <Button
              variant={userData.isPrivate ? 'default' : 'outline'}
              size="sm"
              onClick={handleTogglePrivacy}
              disabled={isPending}
            >
              {userData.isPrivate ? 'Make Public' : 'Make Private'}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Handle</span>
            <span className="font-mono">@{userData.xHandle}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Registered</span>
            <span>
              {userData.registeredAt
                ? new Date(userData.registeredAt * 1000).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>This action cannot be undone. This will permanently delete your account.</p>
                    <ul className="text-sm space-y-1 mt-2">
                      <li>Your handle will be permanently retired</li>
                      <li>You cannot re-register for 30 days</li>
                      <li>Your kudos history will be preserved</li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteImmediately}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
