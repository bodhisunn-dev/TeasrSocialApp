'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/lib/wallet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DirectMessageWithUsers, User as UserType } from '@shared/schema';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';

const API_URL = 'https://c762b603-597d-4da8-ba6b-42f2889fe9d1-00-3qi12bbre3n9x.picard.replit.dev';

export default function Messages() {
  const { address } = useWallet();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [input, setInput] = useState('');

  // Parse query parameter to auto-select user
  const queryParams = new URLSearchParams(location.split('?')[1] || '');
  const userIdFromQuery = queryParams.get('user');

  // -----------------------------
  // 1. Current User
  // -----------------------------
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['current-user', address],
    enabled: !!address,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/users/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!res.ok) throw new Error('Auth failed');
      return res.json() as Promise<UserType>;
    },
  });

  // -----------------------------
  // 2. Paid Users (users who paid for your content or you paid for their content)
  // -----------------------------
  const { data: paymentRelationships } = useQuery<{ patrons: UserType[]; creatorsPaid: UserType[] }>({
    queryKey: ['payment-relationships', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/users/payment-relationships`, {
        headers: { 'x-wallet-address': address || '' },
      });
      if (!res.ok) return { patrons: [], creatorsPaid: [] };
      return res.json();
    },
  });

  // Combine patrons and creators, remove duplicates
  const paidUsers = React.useMemo(() => {
    if (!paymentRelationships) return [];
    const combined = [...paymentRelationships.patrons, ...paymentRelationships.creatorsPaid];
    const uniqueUsers = combined.filter((user, index, self) =>
      index === self.findIndex((u) => u.id === user.id)
    );
    return uniqueUsers;
  }, [paymentRelationships]);

  // Auto-select user from query param when paidUsers loads
  useEffect(() => {
    if (userIdFromQuery && paidUsers.length > 0 && !selectedUser) {
      const userToSelect = paidUsers.find(u => u.id === userIdFromQuery);
      if (userToSelect) {
        setSelectedUser(userToSelect);
        // Clear the query param after selecting
        setLocation('/messages');
      }
    }
  }, [userIdFromQuery, paidUsers, selectedUser, setLocation]);

  // -----------------------------
  // 4. Messages
  // -----------------------------
  const { data: messages = [] } = useQuery<DirectMessageWithUsers[]>({
    queryKey: ['messages', selectedUser?.id],
    enabled: !!selectedUser && !!address,
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await fetch(`${API_URL}/api/messages/${selectedUser.id}`, {
        headers: { 'x-wallet-address': address || '' },
      });
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json() as Promise<DirectMessageWithUsers[]>;
    },
  });

  // -----------------------------
  // 5. Send Message
  // -----------------------------
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUser || !address) throw new Error('No recipient or wallet');

      const payload = {
        content: content.trim(),
      };

      console.log('[Send Debug] Sending message to:', selectedUser.id, 'content:', content);

      const res = await fetch(`${API_URL}/api/messages/${selectedUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Send Debug] Error Body:', errorText);
        throw new Error(errorText || `HTTP ${res.status} - Check backend /api/messages`);
      }

      return res.json() as Promise<DirectMessageWithUsers>;
    },
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['paid-users', currentUser?.id] });
    },
    onError: (err: any) => {
      console.error('[Send Error]', err);
      alert(`Send failed: ${err.message}`);
    },
  });

  // -----------------------------
  // 6. Mark as Read
  // -----------------------------
  useEffect(() => {
    if (selectedUser && address) {
      fetch(`${API_URL}/api/messages/${selectedUser.id}/read`, {
        method: 'PUT',
        headers: { 'x-wallet-address': address },
      }).catch(console.error);
    }
  }, [selectedUser, address]);

  // -----------------------------
  // 7. No Wallet Guard
  // -----------------------------
  if (!address) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-6 text-center">
          <p>Connect your wallet to view messages</p>
        </Card>
      </div>
    );
  }

  const canSend = !!selectedUser && !sendMutation.isPending && input.trim().length > 0;

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-2 sm:p-4 pt-20">
        <Button variant="ghost" onClick={() => setLocation('/')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Feed
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* Sidebar: Chats with Paid Users */}
          <Card className={`${selectedUser ? 'hidden md:block' : ''} md:col-span-1 overflow-hidden flex flex-col`}>
            <div className="p-3 border-b font-bold">Chats</div>
            <ScrollArea className="flex-1">
              {paidUsers.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No chats available</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Unlock content to start chatting with creators
                  </p>
                </div>
              ) : (
                paidUsers.map((user) => (
                  <div
                    key={user.id}
                    data-testid={`chat-user-${user.id}`}
                    className={`p-3 border-b cursor-pointer hover-elevate active-elevate-2 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-accent/50' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={user.profileImagePath || ''} alt={user.username} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">@{user.username}</p>
                        <p className="text-xs text-muted-foreground">Available to chat</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Chat Panel */}
          <Card className={`${!selectedUser ? 'hidden md:block' : ''} md:col-span-2 flex flex-col overflow-hidden`}>
            {selectedUser ? (
              <>
                <div className="p-3 border-b flex items-center gap-2 bg-muted/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedUser(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={selectedUser.profileImagePath || ''} alt={selectedUser.username} />
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">@{selectedUser.username}</span>
                </div>

                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">No messages yet. Say hi!</p>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === currentUser?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-xs lg:max-w-md rounded-lg p-3 text-sm shadow-sm ${
                                isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                              }`}
                            >
                              <p className="break-words">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canSend) sendMutation.mutate(input);
                  }}
                  className="p-3 border-t bg-muted/50"
                >
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sendMutation.isPending}
                      autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={!canSend}>
                      {sendMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-current" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <User className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
