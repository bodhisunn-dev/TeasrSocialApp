import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { ViralPostBanner } from '@/components/ViralPostBanner';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp, Eye, DollarSign, User, Crown, Medal, Award } from 'lucide-react';
import { Link } from 'wouter';
import { PostWithCreator, UserWithStats } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

type LeaderboardType = 'creators' | 'posts';

function ViralPostCard({ post }: { post: PostWithCreator }) {
  const [revenue, setRevenue] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}/revenue?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch revenue');
        }
        const data = await response.json();
        setRevenue(data.revenue || '0.00');
      } catch (err) {
        console.error('Error fetching revenue for post', post.id, err);
        setRevenue('0.00');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRevenue();
    // Refetch every 10 seconds to get updated revenue
    const interval = setInterval(fetchRevenue, 10000);
    return () => clearInterval(interval);
  }, [post.id]);

  return (
    <Card className="overflow-hidden group cursor-pointer hover-elevate transition-all" data-testid={`viral-post-${post.id}`}>
      <div className="aspect-square relative">
        <img
          src={post.blurredThumbnailPath}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <TrendingUp className="w-3 h-3 mr-1" />
            Viral
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2">
          <Badge className="bg-green-600 text-white">
            <DollarSign className="w-3 h-3 mr-1" />
            {loading ? '...' : `$${parseFloat(revenue).toFixed(2)}`}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1">{post.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href={`/profile/${post.creator.username}`}>
            <span className="hover:underline cursor-pointer">@{post.creator.username}</span>
          </Link>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{post.viewCount.toLocaleString()} views</span>
          <span>{post.upvoteCount.toLocaleString()} upvotes</span>
        </div>
      </div>
    </Card>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('creators');

  // Fetch all posts to calculate leaderboard
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithCreator[]>({
    queryKey: ['/api/posts'],
  });

  // Calculate creator leaderboard
  const creatorLeaderboard = posts?.reduce((acc, post) => {
    const existing = acc.find(c => c.id === post.creator.id);
    if (existing) {
      existing.totalViews += post.viewCount;
      existing.totalUpvotes += post.upvoteCount;
      existing.totalPosts += 1;
      existing.totalRevenue += parseFloat(post.price);
    } else {
      acc.push({
        ...post.creator,
        totalViews: post.viewCount,
        totalUpvotes: post.upvoteCount,
        totalPosts: 1,
        totalRevenue: parseFloat(post.price),
      });
    }
    return acc;
  }, [] as any[])
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 50);

  // Top posts by views
  const topPostsByViews = [...(posts || [])]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 20);

  // Top posts by upvotes
  const topPostsByUpvotes = [...(posts || [])]
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, 20);

  // Viral posts
  const viralPosts = posts?.filter(p => p.isViral) || [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500 to-amber-600 text-white";
    if (rank === 2) return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
    if (rank === 3) return "bg-gradient-to-r from-amber-600 to-orange-500 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <ViralPostBanner />
      </div>

      <main className="pt-4 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-display mb-4">
              Leaderboard
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Top creators and trending content on TEASR
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="creators" className="w-full" onValueChange={(v) => setActiveTab(v as LeaderboardType)}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="creators" data-testid="tab-creators">
                <User className="w-4 h-4 mr-2" />
                Top Creators
              </TabsTrigger>
              <TabsTrigger value="posts" data-testid="tab-posts">
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending Posts
              </TabsTrigger>
            </TabsList>

            {/* Top Creators */}
            <TabsContent value="creators" className="space-y-4">
              {postsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3" data-testid="leaderboard-creators">
                  {/* Top 3 - Featured */}
                  {creatorLeaderboard?.slice(0, 3).map((creator, index) => (
                    <Card key={creator.id} className={`p-4 sm:p-6 ${index === 0 ? 'border-primary/50 bg-primary/5' : ''}`} data-testid={`creator-rank-${index + 1}`}>
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                        {/* Rank */}
                        <div className={`flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full ${getRankBadge(index + 1)} font-bold text-xl sm:text-2xl flex-shrink-0`}>
                          {getRankIcon(index + 1) || (index + 1)}
                        </div>

                        {/* Avatar */}
                        <Link href={`/profile/${creator.username}`}>
                          <Avatar className="w-16 h-16 sm:w-16 sm:h-16 cursor-pointer hover:opacity-80 transition-opacity">
                            <AvatarImage src={creator.profileImagePath || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl">
                              {creator.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left w-full">
                          <Link href={`/profile/${creator.username}`}>
                            <h3 className="text-lg sm:text-xl font-semibold hover:underline cursor-pointer mb-2">
                              @{creator.username}
                            </h3>
                          </Link>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">{creator.totalViews.toLocaleString()}</span> views
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">{creator.totalUpvotes.toLocaleString()}</span> upvotes
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">{creator.totalPosts}</span> posts
                            </div>
                          </div>
                        </div>

                        {/* Badge */}
                        {index === 0 && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">
                            <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            #1 Creator
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}

                  {/* Rest of creators */}
                  {creatorLeaderboard?.slice(3).map((creator, index) => {
                    const rank = index + 4;
                    return (
                      <Card key={creator.id} className="p-4 hover-elevate transition-all" data-testid={`creator-rank-${rank}`}>
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-semibold text-muted-foreground">
                            {rank}
                          </div>

                          {/* Avatar */}
                          <Link href={`/profile/${creator.username}`}>
                            <Avatar className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity">
                              <AvatarImage src={creator.profileImagePath || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {creator.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/profile/${creator.username}`}>
                              <h4 className="font-semibold hover:underline cursor-pointer truncate">
                                @{creator.username}
                              </h4>
                            </Link>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                              <span>{creator.totalViews.toLocaleString()} views</span>
                              <span>{creator.totalUpvotes.toLocaleString()} upvotes</span>
                              <span>{creator.totalPosts} posts</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {(!creatorLeaderboard || creatorLeaderboard.length === 0) && (
                    <Card className="p-12 text-center">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">No creators yet</h3>
                      <p className="text-muted-foreground">
                        Be the first to upload content and claim the top spot!
                      </p>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Trending Posts */}
            <TabsContent value="posts" className="space-y-6">
              {/* Viral Posts */}
              {viralPosts.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-orange-500" />
                    Viral Posts
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {viralPosts.map((post) => (
                      <ViralPostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top by Views */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-primary" />
                  Most Viewed
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="posts-by-views">
                  {topPostsByViews.slice(0, 8).map((post, index) => (
                    <Card key={post.id} className="overflow-hidden group cursor-pointer hover-elevate transition-all" data-testid={`post-views-${index + 1}`}>
                      <div className="aspect-square relative">
                        <img
                          src={post.blurredThumbnailPath}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className={getRankBadge(index + 1)}>
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{post.title}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          <span className="font-medium">{post.viewCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Top by Upvotes */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  Most Upvoted
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="posts-by-upvotes">
                  {topPostsByUpvotes.slice(0, 8).map((post, index) => (
                    <Card key={post.id} className="overflow-hidden group cursor-pointer hover-elevate transition-all" data-testid={`post-upvotes-${index + 1}`}>
                      <div className="aspect-square relative">
                        <img
                          src={post.blurredThumbnailPath}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className={getRankBadge(index + 1)}>
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{post.title}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-medium">{post.upvoteCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
