'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { useKudos, type UserData, type KudosTransaction, type LeaderboardEntry } from '@/lib/useKudos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TwitterIntegration } from '@/components/twitter-integration';
import { AccountSettings } from '@/components/account-settings';
import { toast } from 'sonner';
import { parseContractError } from '@/lib/errorUtils';
import { Lock } from 'lucide-react';
import type { KudosEntry, UserProfile } from '@/lib/types';
import { isContractDeployed } from '@/config/contract';
import {
  isValidHandle,
  isValidTweetUrl,
  HANDLE_REGEX,
  MIN_HANDLE_LENGTH,
  MAX_HANDLE_LENGTH,
} from '@/lib/validation';

// Debounce delay for handle availability check (in milliseconds)
const DEBOUNCE_DELAY = 300;

export default function KudosApp() {
  const { login, logout } = useLoginWithAbstract();
  const { isConnected } = useAccount();
  const {
    registerUser,
    giveKudos,
    checkUserRegistration,
    checkHandleAvailability,
    getKudosHistory,
    getLeaderboardData,
    isPending,
    isSuccess,
    error
  } = useKudos();

  const [xHandle, setXHandle] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [recentKudos, setRecentKudos] = useState<KudosEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [kudosRecipient, setKudosRecipient] = useState('');
  const [kudosTweetUrl, setKudosTweetUrl] = useState('');
  const [registeredHandle, setRegisteredHandle] = useState<string>('');
  const [kudosStats, setKudosStats] = useState<{ received: number; given: number }>({ received: 0, given: 0 });
  const [userData, setUserData] = useState<UserData | null>(null);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ref for debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadMockData = useCallback(() => {
    const mockKudos: KudosEntry[] = [
      {
        id: '1',
        fromHandle: 'alice_dev',
        toHandle: 'bob_builder',
        tweetUrl: 'https://x.com/alice_dev/status/123',
        timestamp: Date.now() - 3600000,
        message: 'Great work on the API!'
      },
      {
        id: '2',
        fromHandle: 'charlie_coder',
        toHandle: 'alice_dev',
        tweetUrl: 'https://x.com/charlie_coder/status/456',
        timestamp: Date.now() - 7200000,
        message: 'Thanks for the help debugging!'
      },
      {
        id: '3',
        fromHandle: 'bob_builder',
        toHandle: 'dana_designer',
        tweetUrl: 'https://x.com/bob_builder/status/789',
        timestamp: Date.now() - 10800000,
        message: 'Amazing UI design!'
      }
    ];

    const mockLeaderboard: UserProfile[] = [
      { handle: 'alice_dev', kudosReceived: 42, kudosGiven: 38 },
      { handle: 'bob_builder', kudosReceived: 35, kudosGiven: 40 },
      { handle: 'charlie_coder', kudosReceived: 28, kudosGiven: 25 },
      { handle: 'dana_designer', kudosReceived: 25, kudosGiven: 22 },
      { handle: 'eve_engineer', kudosReceived: 20, kudosGiven: 18 }
    ];

    setRecentKudos(mockKudos);
    setLeaderboard(mockLeaderboard);
    setIsLoading(false);
  }, []);

  const loadBlockchainData = useCallback(async () => {
    setIsLoading(true);
    try {
      // If contract not deployed (zero address), use mock data for demo
      if (!isContractDeployed()) {
        loadMockData();
        return;
      }

      // Fetch real blockchain data
      const [historyData, leaderboardData] = await Promise.all([
        getKudosHistory(0, 10),
        getLeaderboardData(10)
      ]);

      // Transform kudos history to KudosEntry format
      if (historyData.length > 0) {
        const transformedKudos: KudosEntry[] = historyData.map((tx: KudosTransaction, index: number) => ({
          id: `${tx.timestamp}-${index}`,
          fromHandle: tx.fromHandle,
          toHandle: tx.toHandle,
          tweetUrl: tx.tweetUrl,
          timestamp: tx.timestamp * 1000, // Convert seconds to milliseconds
        }));
        setRecentKudos(transformedKudos);
      } else {
        setRecentKudos([]);
      }

      // Transform leaderboard data to UserProfile format
      if (leaderboardData.length > 0) {
        const transformedLeaderboard: UserProfile[] = leaderboardData.map((entry: LeaderboardEntry) => ({
          handle: entry.handle,
          kudosReceived: entry.kudosReceived,
          kudosGiven: 0, // Not available from leaderboard call
          walletAddress: entry.address
        }));
        setLeaderboard(transformedLeaderboard);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error loading blockchain data:', error);
      // Fall back to mock data on error
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, [getKudosHistory, getLeaderboardData, loadMockData]);

  const checkRegistrationStatus = useCallback(async () => {
    try {
      const registration = await checkUserRegistration();
      if (registration && registration.isRegistered) {
        setUserData(registration);
        setIsRegistered(true);
        setRegisteredHandle(registration.xHandle);
        setXHandle(registration.xHandle);
        setKudosStats({
          received: registration.kudosReceived,
          given: registration.kudosGiven
        });
        setUserProfile({
          handle: registration.xHandle,
          kudosReceived: registration.kudosReceived,
          kudosGiven: registration.kudosGiven
        });

        toast.success(`Welcome back @${registration.xHandle}! You have ${registration.kudosReceived} kudos received and ${registration.kudosGiven} kudos given.`);
      } else {
        // Reset state if user is no longer registered (e.g., after deletion)
        setUserData(null);
        setIsRegistered(false);
        setRegisteredHandle('');
        setXHandle('');
        setKudosStats({ received: 0, given: 0 });
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  }, [checkUserRegistration]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  useEffect(() => {
    if (isConnected) {
      checkRegistrationStatus();
    }
  }, [isConnected, checkRegistrationStatus]);

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction successful!');
      loadBlockchainData();
    }
  }, [isSuccess, loadBlockchainData]);

  useEffect(() => {
    if (error) {
      toast.error(`Transaction failed: ${error.message}`);
    }
  }, [error]);

  const handleConnect = async () => {
    try {
      await login();
      toast.success('Wallet connected successfully!');
    } catch {
      toast.error('Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
      setIsRegistered(false);
      setXHandle('');
      setRegisteredHandle('');
      setUserProfile(null);
      setKudosStats({ received: 0, given: 0 });
      setUserData(null);
      toast.success('Wallet disconnected');
    } catch {
      toast.error('Failed to disconnect wallet');
    }
  };

  const handleRegister = async () => {
    if (!xHandle) {
      toast.error('Please enter your X handle');
      return;
    }

    // Enhanced validation for new contract
    if (xHandle.length < MIN_HANDLE_LENGTH) {
      toast.error(`Handle must be at least ${MIN_HANDLE_LENGTH} characters long`);
      return;
    }

    if (xHandle.length > MAX_HANDLE_LENGTH) {
      toast.error(`Handle must be ${MAX_HANDLE_LENGTH} characters or less`);
      return;
    }

    if (!HANDLE_REGEX.test(xHandle)) {
      toast.error('Handle can only contain letters, numbers, and underscores');
      return;
    }

    // Check handle availability
    const available = await checkHandleAvailability(xHandle);
    if (!available) {
      toast.error('This handle is not available (already taken or retired)');
      return;
    }

    try {
      await registerUser(xHandle);
      setIsRegistered(true);
      setRegisteredHandle(xHandle);
      setUserProfile({
        handle: xHandle,
        kudosReceived: 0,
        kudosGiven: 0
      });
      setKudosStats({ received: 0, given: 0 });
      toast.success(`Successfully registered as @${xHandle}! You can now give and receive kudos.`);
    } catch (error: unknown) {
      const errorMessage = parseContractError(error);
      toast.error(errorMessage);
      console.error('Registration error:', error);
    }
  };

  const handleGiveKudos = async () => {
    if (!kudosRecipient || !kudosTweetUrl) {
      toast.error('Please enter both recipient handle and tweet URL');
      return;
    }

    // Validate recipient handle
    if (!HANDLE_REGEX.test(kudosRecipient)) {
      toast.error('Recipient handle can only contain letters, numbers, and underscores');
      return;
    }

    // Validate tweet URL
    if (!isValidTweetUrl(kudosTweetUrl)) {
      toast.error('Please enter a valid X (Twitter) URL');
      return;
    }

    // Check if trying to give kudos to themselves
    if (kudosRecipient.toLowerCase() === xHandle.toLowerCase()) {
      toast.error('You cannot give kudos to yourself. Please select a different recipient.');
      return;
    }

    try {
      await giveKudos(kudosRecipient, kudosTweetUrl);

      const newKudos: KudosEntry = {
        id: Date.now().toString(),
        fromHandle: xHandle,
        toHandle: kudosRecipient,
        tweetUrl: kudosTweetUrl,
        timestamp: Date.now(),
        message: 'Kudos sent!'
      };

      setRecentKudos([newKudos, ...recentKudos]);
      setKudosRecipient('');
      setKudosTweetUrl('');

      toast.success(`Kudos successfully sent to @${kudosRecipient}! This recognition is now permanently recorded on the blockchain.`);
    } catch (error: unknown) {
      const errorMessage = parseContractError(error);
      toast.error(errorMessage);
      console.error('Kudos error:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Debounced handle change handler
  const handleXHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const handle = e.target.value;
    setXHandle(handle);

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset availability state while typing
    setHandleAvailable(null);

    // Check availability with debounce
    if (isValidHandle(handle)) {
      setCheckingHandle(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const available = await checkHandleAvailability(handle);
          setHandleAvailable(available);
        } catch (err) {
          console.error('Error checking handle availability:', err);
          setHandleAvailable(null);
        } finally {
          setCheckingHandle(false);
        }
      }, DEBOUNCE_DELAY);
    } else {
      setCheckingHandle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl">Kudos Tracker</CardTitle>
                <CardDescription>Give kudos to your friends on X with blockchain verification</CardDescription>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-4">
                  {isRegistered && (
                    <div className="text-right">
                      <p className="text-sm font-medium">@{registeredHandle || xHandle}</p>
                      {(kudosStats.received > 0 || kudosStats.given > 0) && (
                        <p className="text-xs text-muted-foreground">
                          {kudosStats.received} received · {kudosStats.given} given
                        </p>
                      )}
                    </div>
                  )}
                  <Badge variant="secondary" className="px-3 py-1">
                    {isRegistered ? `@${registeredHandle || xHandle}` : 'Not Registered'}
                  </Badge>
                  <Button onClick={handleDisconnect} variant="outline">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnect} size="lg">
                  Connect Wallet
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Registration Card */}
        {isConnected && !isRegistered && (
          <Card>
            <CardHeader>
              <CardTitle>Register Your X Handle</CardTitle>
              <CardDescription>Link your X account to start giving and receiving kudos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 max-w-sm space-y-2">
                  <Input
                    placeholder="e.g. john_doe (without @, 3-15 chars)"
                    value={xHandle}
                    onChange={handleXHandleChange}
                    maxLength={15}
                  />
                  {checkingHandle && (
                    <p className="text-xs text-muted-foreground">Checking availability...</p>
                  )}
                  {xHandle.length >= 3 && handleAvailable !== null && !checkingHandle && (
                    <p className={`text-xs ${handleAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {handleAvailable ? 'Handle available' : 'Handle not available'}
                    </p>
                  )}
                </div>
                <Button onClick={handleRegister} disabled={isPending}>
                  {isPending ? 'Registering...' : 'Register'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Twitter Integration - only for registered users */}
        {isRegistered && (
          <TwitterIntegration registeredHandle={registeredHandle || xHandle} />
        )}

        {/* Manual Kudos Entry - only for registered users */}
        {isRegistered && (
          <Card>
            <CardHeader>
              <CardTitle>Manual Kudos Entry</CardTitle>
              <CardDescription>Or directly send kudos with a tweet URL</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="e.g. alice_dev (recipient's handle)"
                    value={kudosRecipient}
                    onChange={(e) => setKudosRecipient(e.target.value)}
                    className="flex-1"
                    maxLength={15}
                  />
                  <Input
                    placeholder="https://x.com/username/status/123456789"
                    value={kudosTweetUrl}
                    onChange={(e) => setKudosTweetUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleGiveKudos} disabled={isPending}>
                    {isPending ? 'Sending...' : 'Send Kudos'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tip: Use the format @username ++ in your tweets to automatically track kudos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Kudos Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Kudos Activity</CardTitle>
            <CardDescription>Latest kudos given across the network</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : recentKudos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No kudos yet. Be the first to give kudos!
              </div>
            ) : (
              <div className="space-y-4">
                {recentKudos.map((kudos) => (
                  <div key={kudos.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{kudos.fromHandle[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          @{kudos.fromHandle} - @{kudos.toHandle}
                        </div>
                        {kudos.message && (
                          <div className="text-sm text-muted-foreground">{kudos.message}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={kudos.tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        View Tweet
                      </a>
                      <Badge variant="outline">{formatTimestamp(kudos.timestamp)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Section */}
        <Card>
          <CardHeader>
            <CardTitle>Kudos Leaderboard</CardTitle>
            <CardDescription>Top kudos receivers and givers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 bg-muted rounded" />
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leaderboard data yet. Start giving kudos to populate the leaderboard!
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <div key={user.handle} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                      <Avatar>
                        <AvatarFallback>{user.handle[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">@{user.handle}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.kudosGiven} given
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {user.kudosReceived} kudos
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Profile Section - only for registered users */}
        {isRegistered && userProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your kudos statistics and history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl">
                      {userProfile.handle[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">@{userProfile.handle}</h3>
                      {userData?.isPrivate && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {userProfile.kudosReceived} Received
                      </Badge>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {userProfile.kudosGiven} Given
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Keep giving kudos to climb the leaderboard! Your kudos are permanently recorded on the blockchain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Settings - only for registered users */}
        {isRegistered && (
          <AccountSettings
            userData={userData}
            onDataUpdate={checkRegistrationStatus}
          />
        )}
      </div>
    </div>
  );
}
