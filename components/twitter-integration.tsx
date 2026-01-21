'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Twitter, CheckCircle, AlertCircle, Loader2, Plus, Send, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useKudos } from '@/lib/useKudos';
import type { SimulatedTweet, FoundTweet } from '@/lib/types';

interface TwitterIntegrationProps {
  registeredHandle?: string;
}

export function TwitterIntegration({ registeredHandle }: TwitterIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState(registeredHandle || '');
  const [recipientHandle, setRecipientHandle] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [simulatedTweets, setSimulatedTweets] = useState<SimulatedTweet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchHandle, setSearchHandle] = useState('');
  const [foundTweets, setFoundTweets] = useState<FoundTweet[]>([]);
  const { giveKudos } = useKudos();

  useEffect(() => {
    if (registeredHandle) {
      setTwitterHandle(registeredHandle);
      setIsConnected(true);
    }
  }, [registeredHandle]);

  const connectTwitter = () => {
    toast.info('X OAuth integration would redirect to Twitter for authentication');
    setIsConnected(true);
    setTwitterHandle('testuser');
  };

  const generateTweetId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
  };

  const simulateTweet = () => {
    if (!recipientHandle || !twitterHandle) {
      toast.error('Please enter both your handle and recipient handle');
      return;
    }

    // Check for self-kudos
    if (recipientHandle.toLowerCase() === twitterHandle.toLowerCase()) {
      toast.error('You cannot give kudos to yourself! Please enter a different recipient.');
      return;
    }

    const tweetId = generateTweetId();
    const tweet: SimulatedTweet = {
      id: tweetId,
      text: `@${recipientHandle} ++ for being awesome! 🎉`,
      author: twitterHandle,
      timestamp: new Date(),
      processed: false
    };

    setSimulatedTweets(prev => [tweet, ...prev]);
    setTweetText(`@${recipientHandle} ++ for being awesome! 🎉`);
    toast.success('Tweet simulated! Now process it to give kudos.');
  };

  const processTweet = async (tweet: SimulatedTweet) => {
    setIsProcessing(true);
    const tweetUrl = `https://twitter.com/${tweet.author}/status/${tweet.id}`;
    
    const recipient = tweet.text.match(/@(\w+)\s*\+\+/)?.[1];
    if (!recipient) {
      toast.error('Could not extract recipient from tweet');
      setIsProcessing(false);
      return;
    }
    
    try {

      // For demo purposes - simulate success for common test handles
      const testHandles = ['alice_dev', 'bob_builder', 'charlie_coder', 'vitalik'];
      if (testHandles.includes(recipient.toLowerCase())) {
        // Simulate a successful transaction
        setSimulatedTweets(prev => 
          prev.map(t => t.id === tweet.id ? { ...t, processed: true } : t)
        );
        
        toast.success(`🎉 DEMO MODE: Kudos successfully simulated for @${recipient}! In production, they would need to be registered first.`, {
          duration: 5000
        });

        setIsProcessing(false);
        return;
      }

      // Try real transaction
      await giveKudos(recipient, tweetUrl);
      
      setSimulatedTweets(prev => 
        prev.map(t => t.id === tweet.id ? { ...t, processed: true } : t)
      );
      
      toast.success(`Kudos given to @${recipient}!`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process kudos';
      if (errorMsg.includes('Recipient not registered')) {
        toast.error(`❌ @${recipient} is not registered. For testing, try: @alice_dev, @bob_builder, or @vitalik (demo mode will simulate success)`, {
          duration: 6000
        });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const searchForKudos = async () => {
    if (!searchHandle) {
      toast.error('Please enter a handle to search');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/twitter/process-kudos?username=${searchHandle}`);
      const data = await response.json();
      
      if (response.ok) {
        setFoundTweets(data.tweets || []);
        toast.success(`Found ${data.count || 0} kudos tweets`);
      } else {
        toast.error(data.error || 'Failed to search tweets');
      }
    } catch {
      toast.error('Failed to search for kudos');
    } finally {
      setIsProcessing(false);
    }
  };

  const processRealTweet = async (tweetUrl: string) => {
    setIsProcessing(true);
    try {
      const match = tweetUrl.match(/twitter\.com\/(\w+)\/status\/\d+/);
      if (!match) {
        toast.error('Invalid tweet URL');
        return;
      }

      const response = await fetch('/api/twitter/process-kudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetUrl,
          giverHandle: match[1],
          recipientHandle: recipientHandle
        })
      });

      const data = await response.json();
      
      if (response.ok && data.verified) {
        await giveKudos(recipientHandle, tweetUrl);
        toast.success('Kudos processed from real tweet!');
      } else {
        toast.error(data.error || 'Failed to verify tweet');
      }
    } catch {
      toast.error('Failed to process tweet');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5" />
          X (Twitter) Integration
        </CardTitle>
        <CardDescription>
          Give kudos directly from X by tweeting &quot;@username ++&quot;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="test" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="test">Test Mode</TabsTrigger>
            <TabsTrigger value="real">Real Tweets</TabsTrigger>
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h3 className="font-semibold mb-2">How Testing Works:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>You&apos;re connected as <strong>@{twitterHandle}</strong></li>
                  <li>Enter a DIFFERENT recipient handle (e.g., &quot;alice_dev&quot;, &quot;bob_builder&quot;)</li>
                  <li>Create a test tweet with the &quot;@username ++&quot; format</li>
                  <li>Process the simulated tweet to give kudos on-chain</li>
                  <li>Check the leaderboard to see the results!</li>
                </ol>
                <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900 rounded text-sm">
                  <strong>Important:</strong> You cannot give kudos to yourself!
                </div>
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded">
                  <p className="text-sm font-semibold mb-1">🎯 Demo Mode Test Handles:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">These handles will simulate success for testing (click to use):</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button 
                      onClick={() => setRecipientHandle('vitalik')}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded text-xs hover:bg-gray-100 border border-green-300"
                    >
                      @vitalik ✨
                    </button>
                    <button 
                      onClick={() => setRecipientHandle('alice_dev')}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded text-xs hover:bg-gray-100 border border-green-300"
                    >
                      @alice_dev ✨
                    </button>
                    <button 
                      onClick={() => setRecipientHandle('bob_builder')}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded text-xs hover:bg-gray-100 border border-green-300"
                    >
                      @bob_builder ✨
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">✨ = Demo mode (simulated success)</p>
                </div>
              </div>

              {!isConnected ? (
                <div className="space-y-4">
                  <Input
                    placeholder="Your X handle (e.g., elonmusk)"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                  />
                  <Button onClick={connectTwitter} className="w-full">
                    <Twitter className="mr-2 h-4 w-4" />
                    Connect X Account (Simulated)
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <span className="text-sm">Connected as @{twitterHandle}</span>
                    <Badge variant="secondary">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Give Kudos To:</label>
                    <Input
                      placeholder="Recipient X handle (e.g., vitalikbuterin)"
                      value={recipientHandle}
                      onChange={(e) => setRecipientHandle(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={simulateTweet}
                    className="w-full"
                    disabled={!recipientHandle}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test Tweet with ++
                  </Button>

                  {tweetText && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm font-mono">{tweetText}</p>
                    </div>
                  )}
                </div>
              )}

              {simulatedTweets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Simulated Tweets:</h3>
                  {simulatedTweets.map((tweet) => (
                    <div
                      key={tweet.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">@{tweet.author}</p>
                          <p className="text-sm">{tweet.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {tweet.timestamp.toLocaleString()}
                          </p>
                        </div>
                        {tweet.processed ? (
                          <Badge variant="secondary">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Processed
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => processTweet(tweet)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="mr-1 h-3 w-3" />
                                Process
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="real" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Real Tweet Processing</p>
                    <p className="text-sm">
                      Paste a real X/Twitter URL that contains &quot;@username ++&quot; to process kudos.
                      Note: Requires Twitter API access to verify tweets.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tweet URL:</label>
                <Input
                  placeholder="https://twitter.com/username/status/..."
                  id="tweet-url"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Handle:</label>
                <Input
                  placeholder="Recipient handle from the tweet"
                  value={recipientHandle}
                  onChange={(e) => setRecipientHandle(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  const url = (document.getElementById('tweet-url') as HTMLInputElement)?.value;
                  if (url) processRealTweet(url);
                }}
                disabled={isProcessing || !recipientHandle}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Twitter className="mr-2 h-4 w-4" />
                )}
                Process Real Tweet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <h3 className="font-semibold mb-2">Kudos Monitoring</h3>
                <p className="text-sm">
                  Search for kudos tweets mentioning a specific user.
                  This would normally run automatically via webhooks.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Search for @username kudos"
                  value={searchHandle}
                  onChange={(e) => setSearchHandle(e.target.value)}
                />
                <Button
                  onClick={searchForKudos}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {foundTweets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Found Kudos Tweets:</h3>
                  {foundTweets.map((tweet) => (
                    <div key={tweet.id} className="p-3 border rounded-lg">
                      <p className="text-sm font-medium">@{tweet.authorUsername}</p>
                      <p className="text-sm">{tweet.text}</p>
                      <a
                        href={tweet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on X
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}