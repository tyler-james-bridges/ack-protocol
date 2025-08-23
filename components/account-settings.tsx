'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useKudos, type UserData } from '@/lib/useKudos';
import { 
  Shield, 
  Trash2, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Clock,
  CheckCircle
} from 'lucide-react';

interface AccountSettingsProps {
  userData: UserData | null;
  onDataUpdate: () => void;
}

export function AccountSettings({ userData, onDataUpdate }: AccountSettingsProps) {
  const { 
    requestAccountDeletion, 
    cancelAccountDeletion,
    executeAccountDeletion,
    setProfilePrivacy,
    isPending,
    isSuccess,
    error,
    lastAction
  } = useKudos();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionTimeRemaining, setDeletionTimeRemaining] = useState<string>('');
  const [canExecuteDeletion, setCanExecuteDeletion] = useState(false);

  useEffect(() => {
    if (userData?.deletionRequestedAt && userData.deletionRequestedAt > 0) {
      const interval = setInterval(() => {
        const now = Date.now() / 1000;
        const deletionTime = (userData.deletionRequestedAt || 0) + (7 * 24 * 60 * 60); // 7 days
        const remaining = deletionTime - now;
        
        if (remaining <= 0) {
          setCanExecuteDeletion(true);
          setDeletionTimeRemaining('Ready for deletion');
        } else {
          const days = Math.floor(remaining / (24 * 60 * 60));
          const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
          const minutes = Math.floor((remaining % (60 * 60)) / 60);
          setDeletionTimeRemaining(`${days}d ${hours}h ${minutes}m`);
          setCanExecuteDeletion(false);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [userData?.deletionRequestedAt]);

  useEffect(() => {
    if (isSuccess) {
      if (lastAction === 'delete') {
        toast.success('Account deletion status updated');
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

  const handleRequestDeletion = async () => {
    try {
      await requestAccountDeletion();
      setShowDeleteConfirm(false);
      toast.info('Account deletion requested. You have 7 days to cancel.');
    } catch (err: unknown) {
      toast.error(`Failed to request deletion: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelAccountDeletion();
      toast.success('Account deletion cancelled');
    } catch (err: unknown) {
      toast.error(`Failed to cancel deletion: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExecuteDeletion = async () => {
    if (!userData?.walletAddress) return;
    try {
      await executeAccountDeletion(userData.walletAddress);
      toast.success('Account deleted successfully');
    } catch (err: unknown) {
      toast.error(`Failed to execute deletion: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const isPendingDeletion = userData.deletionRequestedAt && userData.deletionRequestedAt > 0;

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
        {/* Deletion Warning */}
        {isPendingDeletion && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  Account Deletion Pending
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Your account is scheduled for deletion. Time remaining: {deletionTimeRemaining}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelDeletion}
                    disabled={isPending}
                  >
                    Cancel Deletion
                  </Button>
                  {canExecuteDeletion && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleExecuteDeletion}
                      disabled={isPending}
                    >
                      Execute Deletion Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
              disabled={isPending || !!isPendingDeletion}
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
            {isPendingDeletion ? (
              <Badge variant="destructive" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending Deletion
              </Badge>
            ) : (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* Delete Account */}
        {!isPendingDeletion && (
          <div className="pt-4 border-t">
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                    Are you sure you want to delete your account?
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-300 mt-2 space-y-1">
                    <li>• Your handle will be permanently retired</li>
                    <li>• You&apos;ll have 7 days to cancel this request</li>
                    <li>• You cannot re-register for 30 days after deletion</li>
                    <li>• Your kudos history will be preserved</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRequestDeletion}
                    disabled={isPending}
                    className="flex-1"
                  >
                    Confirm Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}