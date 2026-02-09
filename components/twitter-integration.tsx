'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Twitter, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useKudos } from '@/lib/useKudos';
import type { FoundTweet } from '@/lib/types';

interface TwitterIntegrationProps {
  registeredHandle?: string;
}

export function TwitterIntegration({
  registeredHandle,
}: TwitterIntegrationProps) {
  const [searchHandle, setSearchHandle] = useState('');
  const [foundTweets, setFoundTweets] = useState<FoundTweet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { giveKudos } = useKudos();

  const searchForKudos = async () => {
    if (!searchHandle) {
      toast.error('Please enter a handle to search');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/twitter/process-kudos?username=${searchHandle}`
      );
      const data = await response.json();

      if (response.ok) {
        setFoundTweets(data.tweets || []);
        if (data.count === 0) {
          toast.info('No kudos tweets found for this handle');
        } else {
          toast.success(`Found ${data.count} kudos tweets`);
        }
      } else {
        toast.error(data.error || 'Failed to search tweets');
      }
    } catch {
      toast.error('Failed to search for kudos');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFoundTweet = async (tweet: FoundTweet) => {
    if (!registeredHandle) {
      toast.error('You must be registered to process kudos');
      return;
    }

    setIsProcessing(true);
    try {
      // Extract recipient from tweet text (@username ++ pattern)
      const match = tweet.text.match(/@(\w+)\s*\+\+/);
      const recipient = match?.[1];

      if (!recipient) {
        toast.error('Could not extract recipient from tweet');
        return;
      }

      await giveKudos(recipient, tweet.url);
      toast.success(`Kudos processed for @${recipient}!`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to process';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5" />X (Twitter) Kudos Search
        </CardTitle>
        <CardDescription>
          Search for kudos tweets using the &quot;@username ++&quot; format and
          record them onchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Tweet &quot;@someone ++ great work!&quot; on X</li>
            <li>Search for the handle below to find kudos tweets</li>
            <li>Process them to record the kudos permanently onchain</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search @username for kudos tweets"
            value={searchHandle}
            onChange={(e) => setSearchHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchForKudos()}
          />
          <Button onClick={searchForKudos} disabled={isProcessing}>
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
              <div
                key={tweet.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">@{tweet.authorUsername}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {tweet.text}
                  </p>
                  <a
                    href={tweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on X
                  </a>
                </div>
                <Button
                  size="sm"
                  onClick={() => processFoundTweet(tweet)}
                  disabled={isProcessing}
                  className="ml-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Process'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {foundTweets.length === 0 && searchHandle && !isProcessing && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No results yet. Search for a handle to find kudos tweets.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
