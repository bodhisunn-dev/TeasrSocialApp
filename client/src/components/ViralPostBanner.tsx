
import { useQuery } from '@tanstack/react-query';
import { PostWithCreator } from '@shared/schema';
import { TrendingUp, DollarSign } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

export function ViralPostBanner() {
  const { data: posts } = useQuery<PostWithCreator[]>({
    queryKey: ['/api/posts'],
  });

  const viralPosts = posts?.filter(p => p.isViral) || [];

  if (viralPosts.length === 0) return null;

  // Duplicate posts for seamless infinite scroll
  const duplicatedPosts = [...viralPosts, ...viralPosts, ...viralPosts];

  return (
    <div className="w-full bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 border-b border-orange-500/20 overflow-hidden py-2">
      <motion.div
        className="flex gap-6"
        animate={{
          x: [0, -100 * viralPosts.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: viralPosts.length * 8,
            ease: "linear",
          },
        }}
      >
        {duplicatedPosts.map((post, index) => (
          <Link key={`${post.id}-${index}`} href={`/`}>
            <div className="flex items-center gap-2 px-4 py-1 bg-background/50 backdrop-blur-sm rounded-full border border-orange-500/30 hover:border-orange-500/60 transition-colors cursor-pointer whitespace-nowrap">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">
                {post.title}
              </span>
              <span className="text-xs text-muted-foreground">
                by @{post.creator.username}
              </span>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <DollarSign className="w-3 h-3" />
                {post.price}
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
