import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Badge,
  Heading,
  VStack,
  HStack,
  Text,
  ListRoot,
  ListItem,
  Spinner,
  Button,
  Input,
} from '@chakra-ui/react';
import axios from 'axios';
import { toaster } from './toaster';

interface Podcast {
  title: string;
  xmlurl: string;
}

interface Profile {
  hash: string;
  name: string | null;
  podcasts: Podcast[];
  created_at: string;
}

interface PodcastMetadata {
  description: string | null;
  artwork: string | null;
  categories: string[];
  latestEpisode: {
    title: string | null;
    date: string | null;
  };
  frequency: string | null;
  websiteUrl: string | null;
}

interface PersonalityAnalysis {
  archetype: string;
  summary: string;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  traitNotes: Record<string, string>;
  interests: string[];
  listeningStyle: string;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const FREQUENCY_PALETTE: Record<string, string> = {
  daily: 'green',
  weekly: 'green',
  biweekly: 'teal',
  monthly: 'yellow',
  occasional: 'orange',
  dormant: 'red',
};

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  occasional: 'Occasional',
  dormant: 'Dormant',
  unknown: 'Unknown',
};

const FREQUENCY_EMOJI: Record<string, string> = {
  daily: '🔥',
  weekly: '📅',
  biweekly: '📆',
  monthly: '🗓️',
  occasional: '🌊',
  dormant: '💤',
  unknown: '❓',
};

// Episodes per week for each cadence bucket
const FREQUENCY_WEEKLY_RATE: Record<string, number> = {
  daily: 7,
  weekly: 1,
  biweekly: 0.5,
  monthly: 0.25,
  occasional: 0.1,
  dormant: 0,
  unknown: 0,
};

const FREQUENCY_ORDER = ['daily', 'weekly', 'biweekly', 'monthly', 'occasional', 'dormant', 'unknown'];

const CATEGORY_EMOJIS: Record<string, string> = {
  'Technology': '💻',
  'Business': '💼',
  'News': '📰',
  'News Commentary': '🗣️',
  'Science': '🔬',
  'Natural Sciences': '🧪',
  'Social Sciences': '🧠',
  'Arts': '🎨',
  'Visual Arts': '🖼️',
  'Performing Arts': '🎭',
  'Comedy': '😄',
  'Comedy Interviews': '🎤',
  'Stand-Up': '🎙️',
  'Health & Fitness': '🏃',
  'Fitness': '💪',
  'Medicine': '🩺',
  'Mental Health': '🧘',
  'Nutrition': '🥗',
  'Alternative Health': '🌿',
  'Society & Culture': '🌍',
  'Society': '🌍',
  'Culture': '🎭',
  'Education': '📚',
  'Self-Improvement': '🌱',
  'Language Learning': '🗣️',
  'How To': '🔧',
  'Sports': '⚽',
  'Soccer': '⚽',
  'Football': '🏈',
  'Basketball': '🏀',
  'Baseball': '⚾',
  'Cricket': '🏏',
  'Racing': '🏎️',
  'Rugby': '🏉',
  'Swimming': '🏊',
  'Tennis': '🎾',
  'Golf': '⛳',
  'True Crime': '🔍',
  'History': '📜',
  'Music': '🎵',
  'Music History': '🎼',
  'Music Interviews': '🎤',
  'Religion & Spirituality': '🙏',
  'Christianity': '✝️',
  'Islam': '☪️',
  'Judaism': '✡️',
  'Buddhism': '☸️',
  'Spirituality': '✨',
  'Government': '🏛️',
  'Politics': '🗳️',
  'Fiction': '📖',
  'Science Fiction': '🚀',
  'Drama': '🎭',
  'Horror': '👻',
  'Leisure': '🎮',
  'Games': '🎮',
  'Video Games': '🕹️',
  'Hobbies': '🔧',
  'Animation': '🎨',
  'Anime': '🍜',
  'Kids & Family': '👨‍👩‍👧',
  'Kids': '👶',
  'Parenting': '👨‍👩‍👧‍👦',
  'Stories for Kids': '📖',
  'Travel': '✈️',
  'Outdoors': '🏔️',
  'Wilderness': '🌲',
  'Food': '🍕',
  'TV & Film': '🎬',
  'Film History': '🎥',
  'Film Interviews': '🎬',
  'Documentary': '📽️',
  'Books': '📚',
  'Design': '✏️',
  'Fashion & Beauty': '👗',
  'Entrepreneurship': '🚀',
  'Investing': '📈',
  'Marketing': '📢',
  'Management': '👔',
  'Finance': '💰',
  'Personal Finance': '💵',
  'Careers': '📋',
  'Pets & Animals': '🐾',
  'Fantasy Sports': '🏆',
  'Relationships': '❤️',
  'Sexuality': '💛',
  'Philosophy': '💭',
  'Personal Journals': '📓',
  'Interviews': '🎙️',
  'Language': '🌐',
  'Astronomy': '🔭',
  'Environment': '🌿',
  'Healthcare': '🏥',
  'Non-Profit': '🤝',
};

function getCategoryEmoji(category: string): string {
  if (CATEGORY_EMOJIS[category]) return CATEGORY_EMOJIS[category];
  // Fuzzy match on first word
  const first = category.split(/[\s&]/)[0];
  const match = Object.entries(CATEGORY_EMOJIS).find(([k]) => k.startsWith(first));
  return match ? match[1] : '🎙️';
}

const TRAIT_LABELS: Record<string, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism',
};

const TRAIT_EMOJIS: Record<string, string> = {
  openness: '🔭',
  conscientiousness: '📋',
  extraversion: '🌟',
  agreeableness: '🤝',
  neuroticism: '🌊',
};

const TRAIT_COLORS: Record<string, string> = {
  openness: 'var(--chakra-colors-purple-400)',
  conscientiousness: 'var(--chakra-colors-green-400)',
  extraversion: 'var(--chakra-colors-orange-400)',
  agreeableness: 'var(--chakra-colors-teal-400)',
  neuroticism: 'var(--chakra-colors-red-400)',
};

const TRAIT_ORDER: (keyof PersonalityAnalysis['traits'])[] = [
  'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
];

function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <Box h="7px" bg="gray.100" borderRadius="full" overflow="hidden">
      <Box
        h="7px"
        borderRadius="full"
        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: color, transition: 'width 0.6s ease' }}
      />
    </Box>
  );
}

function ProfilePage() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [enriched, setEnriched] = useState<Record<string, PodcastMetadata | null>>({});
  const [enriching, setEnriching] = useState(false);

  const [personality, setPersonality] = useState<PersonalityAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const sortedPodcasts = useMemo(() => {
    if (!profile) return [];
    return [...profile.podcasts].sort((a, b) => {
      const dateA = enriched[a.xmlurl]?.latestEpisode?.date;
      const dateB = enriched[b.xmlurl]?.latestEpisode?.date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [profile, enriched]);

  // Category ratios: count how many podcasts appear in each category
  const categoryRatios = useMemo(() => {
    const enrichedList = Object.values(enriched).filter(Boolean) as PodcastMetadata[];
    if (enrichedList.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const meta of enrichedList) {
      for (const cat of meta.categories) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count, ratio: count / enrichedList.length }))
      .sort((a, b) => b.count - a.count);
  }, [enriched]);

  // Frequency distribution: count per bucket
  const frequencyDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const meta of Object.values(enriched)) {
      if (!meta?.frequency) continue;
      dist[meta.frequency] = (dist[meta.frequency] || 0) + 1;
    }
    return dist;
  }, [enriched]);

  // Estimated new episodes per week across the library
  const weeklyEpisodeRate = useMemo(() => {
    return Object.entries(frequencyDistribution).reduce((sum, [freq, count]) => {
      return sum + (FREQUENCY_WEEKLY_RATE[freq] ?? 0) * count;
    }, 0);
  }, [frequencyDistribution]);

  useEffect(() => {
    axios.get(`/api/profiles/${hash}`)
      .then(async res => {
        setProfile(res.data);
        setNameInput(res.data.name || '');
        await enrichPodcasts(res.data.podcasts);
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          toaster.create({ title: 'Failed to load profile', type: 'error', duration: 3000 });
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const enrichPodcasts = async (podcasts: Podcast[]) => {
    if (podcasts.length === 0) return;
    setEnriching(true);
    let enrichedData: Record<string, PodcastMetadata | null> = {};
    try {
      const res = await axios.post('/api/podcasts/enrich', {
        xmlurls: podcasts.map(p => p.xmlurl),
      });
      enrichedData = res.data;
      setEnriched(enrichedData);
    } catch (err) {
      console.error('Failed to enrich podcasts', err);
    } finally {
      setEnriching(false);
    }
    // Trigger personality analysis once enrichment data is available
    if (Object.keys(enrichedData).length > 0) {
      runPersonalityAnalysis(podcasts, enrichedData);
    }
  };

  const runPersonalityAnalysis = async (
    podcasts: Podcast[],
    enrichedData: Record<string, PodcastMetadata | null>,
  ) => {
    const podcastSummary = podcasts.map(p => ({
      title: p.title,
      categories: enrichedData[p.xmlurl]?.categories ?? [],
      frequency: enrichedData[p.xmlurl]?.frequency ?? 'unknown',
    }));
    // Need at least a few podcasts with category data for a meaningful analysis
    const withCategories = podcastSummary.filter(p => p.categories.length > 0);
    if (withCategories.length < 3) return;

    setAnalyzing(true);
    try {
      const res = await axios.post('/api/personality', { podcastSummary });
      if (res.data.personality) setPersonality(res.data.personality);
    } catch (err: any) {
      // 503 = no API key configured — silently skip
      if (err.response?.status !== 503) {
        console.error('Personality analysis failed', err);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      const res = await axios.patch(`/api/profiles/${hash}`, { name: nameInput.trim() });
      setProfile(prev => prev ? { ...prev, name: res.data.name } : prev);
      toaster.create({ title: 'Name saved!', type: 'success', duration: 1500 });
    } catch {
      toaster.create({ title: 'Failed to save name', type: 'error', duration: 3000 });
    } finally {
      setSavingName(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share !== 'undefined') {
      try {
        await navigator.share({ title: 'Podcast Profile', url });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(url);
          toaster.create({ title: 'Link copied!', type: 'success', duration: 1500 });
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toaster.create({ title: 'Link copied!', type: 'success', duration: 1500 });
    }
  };

  const showAnalysisPanel = !enriching && (categoryRatios.length > 0 || Object.keys(frequencyDistribution).length > 0);

  return (
    <Box minH="100vh" bg="gray.50" py={10} px={4}>
      <VStack gap={8} maxW="2xl" mx="auto" bg="white" p={8} borderRadius="lg" boxShadow="md">
        {loading && <Spinner size="xl" />}

        {notFound && (
          <>
            <Heading as="h1" size="lg">Profile Not Found</Heading>
            <Text color="gray.500">This profile doesn't exist or has been removed.</Text>
            <Button colorPalette="blue" onClick={() => navigate('/')}>Create Your Own Profile</Button>
          </>
        )}

        {profile && (
          <>
            <Heading as="h1" size="lg">
              {profile.name ? `${profile.name}'s Profile` : 'Podcast Profile'}
            </Heading>

            {/* Name form */}
            <Box w="100%" p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.600">
                {profile.name ? 'Your name' : 'Set your name'}
              </Text>
              <HStack>
                <Input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  size="sm"
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <Button
                  size="sm"
                  colorPalette="blue"
                  onClick={handleSaveName}
                  loading={savingName}
                  disabled={!nameInput.trim() || savingName}
                >
                  Save
                </Button>
              </HStack>
            </Box>

            <HStack w="100%" justify="space-between" align="center">
              <Text color="gray.500">{profile.podcasts.length} podcasts</Text>
              {enriching && (
                <HStack gap={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.400">Loading details…</Text>
                </HStack>
              )}
            </HStack>

            <Button colorPalette="blue" onClick={handleShare} w="100%">Share This Profile</Button>

            {/* ── Personality Analysis Panel ── */}
            {showAnalysisPanel && (
              <Box w="100%" borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor="gray.200">
                {/* Panel header */}
                <Box px={5} py={3} bg="gray.50" borderBottomWidth="1px" borderColor="gray.200">
                  <HStack justify="space-between">
                    <Text fontWeight="bold" fontSize="md">🎙️ Personality Insights</Text>
                    {analyzing && (
                      <HStack gap={1.5}>
                        <Spinner size="xs" />
                        <Text fontSize="xs" color="gray.400">Analysing…</Text>
                      </HStack>
                    )}
                  </HStack>
                </Box>

                <Box p={5}>
                  <VStack gap={5} align="stretch">

                    {/* AI Archetype card */}
                    {personality && (
                      <Box
                        p={4}
                        bg="blue.50"
                        borderRadius="lg"
                        borderLeftWidth="4px"
                        borderLeftColor="blue.400"
                      >
                        <Text fontWeight="bold" fontSize="lg" mb={1}>
                          🧠 {personality.archetype}
                        </Text>
                        <Text fontSize="sm" color="gray.700" lineHeight="tall">
                          {personality.summary}
                        </Text>
                        {personality.listeningStyle && (
                          <Text fontSize="xs" color="blue.600" mt={2} fontStyle="italic">
                            🎧 {personality.listeningStyle}
                          </Text>
                        )}
                      </Box>
                    )}

                    {/* ── Category breakdown ── */}
                    {categoryRatios.length > 0 && (
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color="gray.600" mb={3}>
                          📊 Content Mix
                        </Text>
                        <VStack gap={2} align="stretch">
                          {categoryRatios.slice(0, 8).map(({ category, count, ratio }) => (
                            <Box key={category}>
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="sm">
                                  {getCategoryEmoji(category)} {category}
                                </Text>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                                  {Math.round(ratio * 100)}% &nbsp;
                                  <Text as="span" color="gray.400">({count})</Text>
                                </Text>
                              </HStack>
                              <ProgressBar ratio={ratio} color="var(--chakra-colors-blue-400)" />
                            </Box>
                          ))}
                          {categoryRatios.length > 8 && (
                            <Text fontSize="xs" color="gray.400">
                              +{categoryRatios.length - 8} more categories
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    )}

                    {/* ── Frequency / cadence ── */}
                    {Object.keys(frequencyDistribution).length > 0 && (
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color="gray.600" mb={3}>
                          ⏱️ Content Cadence
                        </Text>
                        <HStack flexWrap="wrap" gap={2} mb={2}>
                          {FREQUENCY_ORDER.filter(f => frequencyDistribution[f]).map(freq => (
                            <Badge
                              key={freq}
                              colorPalette={FREQUENCY_PALETTE[freq] ?? 'gray'}
                              variant="subtle"
                              size="md"
                            >
                              {FREQUENCY_EMOJI[freq]} {frequencyDistribution[freq]} {FREQUENCY_LABEL[freq] ?? freq}
                            </Badge>
                          ))}
                        </HStack>
                        {weeklyEpisodeRate > 0 && (
                          <Text fontSize="xs" color="gray.500">
                            📬 Your library generates ~<Text as="span" fontWeight="semibold">{Math.round(weeklyEpisodeRate)}</Text> new episodes per week
                          </Text>
                        )}
                      </Box>
                    )}

                    {/* ── Big Five traits ── */}
                    {personality?.traits && (
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color="gray.600" mb={3}>
                          🌊 Big Five Personality Traits
                        </Text>
                        <VStack gap={3} align="stretch">
                          {TRAIT_ORDER.map(trait => {
                            const score = personality.traits[trait];
                            return (
                              <Box key={trait}>
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize="sm">
                                    {TRAIT_EMOJIS[trait]} {TRAIT_LABELS[trait]}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500" fontWeight="medium">
                                    {score}%
                                  </Text>
                                </HStack>
                                <ProgressBar ratio={score / 100} color={TRAIT_COLORS[trait]} />
                                {personality.traitNotes?.[trait] && (
                                  <Text fontSize="xs" color="gray.500" mt={0.5} lineHeight="short">
                                    {personality.traitNotes[trait]}
                                  </Text>
                                )}
                              </Box>
                            );
                          })}
                        </VStack>
                      </Box>
                    )}

                    {/* ── Key interests ── */}
                    {personality?.interests && personality.interests.length > 0 && (
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color="gray.600" mb={2}>
                          ✨ Key Interests
                        </Text>
                        <HStack flexWrap="wrap" gap={2}>
                          {personality.interests.map((interest, i) => (
                            <Badge key={i} colorPalette="purple" variant="outline" size="sm">
                              {interest}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}

                  </VStack>
                </Box>
              </Box>
            )}

            {/* ── Podcast list ── */}
            <Box w="100%">
              <ListRoot gap={4}>
                {sortedPodcasts.map((p, i) => {
                  const meta = enriched[p.xmlurl];
                  const href = meta?.websiteUrl || undefined;
                  return (
                    <ListItem key={i} listStyle="none">
                      <HStack gap={3} align="start">
                        {/* Artwork */}
                        {meta?.artwork && (
                          <Box flexShrink={0}>
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={meta.artwork}
                                  alt=""
                                  width={64}
                                  height={64}
                                  style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </a>
                            ) : (
                              <img
                                src={meta.artwork}
                                alt=""
                                width={64}
                                height={64}
                                style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                          </Box>
                        )}

                        <Box flex={1} minW={0}>
                          {/* Title + frequency badge */}
                          <HStack justify="space-between" align="start" gap={2}>
                            <Text fontWeight="bold" style={{ overflowWrap: 'anywhere' }}>
                              {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                  {p.title || p.xmlurl}
                                </a>
                              ) : (
                                p.title || p.xmlurl
                              )}
                            </Text>
                            {meta?.frequency && meta.frequency !== 'unknown' && (
                              <Badge
                                colorPalette={FREQUENCY_PALETTE[meta.frequency] ?? 'gray'}
                                variant="subtle"
                                flexShrink={0}
                                size="sm"
                              >
                                {FREQUENCY_LABEL[meta.frequency] ?? meta.frequency}
                              </Badge>
                            )}
                          </HStack>

                          {/* Description */}
                          {meta?.description && (
                            <Text
                              fontSize="sm"
                              color="gray.600"
                              mt={1}
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              } as React.CSSProperties}
                            >
                              {meta.description}
                            </Text>
                          )}

                          {/* Categories */}
                          {meta?.categories && meta.categories.length > 0 && (
                            <HStack gap={1} mt={1} flexWrap="wrap">
                              {meta.categories.slice(0, 3).map((cat, ci) => (
                                <Badge key={ci} colorPalette="blue" variant="outline" size="sm">
                                  {cat}
                                </Badge>
                              ))}
                            </HStack>
                          )}

                          {/* Latest episode */}
                          {meta?.latestEpisode?.title && (
                            <Text fontSize="xs" color="gray.400" mt={1} truncate>
                              Latest: {meta.latestEpisode.title}
                              {meta.latestEpisode.date && (
                                <> · {formatRelativeDate(meta.latestEpisode.date)}</>
                              )}
                            </Text>
                          )}

                          {/* Feed URL (shown when no description loaded yet) */}
                          {!meta?.description && (
                            <Text fontSize="xs" color="gray.400" mt={1} style={{ overflowWrap: 'anywhere' }}>
                              {p.xmlurl}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                    </ListItem>
                  );
                })}
              </ListRoot>
            </Box>

            <Button variant="ghost" onClick={() => navigate('/')}>Create Your Own Profile</Button>
          </>
        )}
      </VStack>
    </Box>
  );
}

export default ProfilePage;
