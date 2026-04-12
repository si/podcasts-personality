import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Badge,
  Title,
  Stack,
  Group,
  Text,
  Loader,
  Button,
  TextInput,
} from '@mantine/core';
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

const FREQUENCY_COLOR: Record<string, string> = {
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
  openness: 'var(--mantine-color-violet-4)',
  conscientiousness: 'var(--mantine-color-green-4)',
  extraversion: 'var(--mantine-color-orange-4)',
  agreeableness: 'var(--mantine-color-teal-4)',
  neuroticism: 'var(--mantine-color-red-4)',
};

const TRAIT_ORDER: (keyof PersonalityAnalysis['traits'])[] = [
  'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
];

function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <Box h={7} bg="gray.1" style={{ borderRadius: 999, overflow: 'hidden' }}>
      <Box
        h={7}
        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }}
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
    <Box mih="100vh" bg="gray.0" py={40} px={16}>
      <Stack gap={24} maw={672} mx="auto" bg="white" p={32} style={{ borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
        {loading && <Loader size="xl" mx="auto" />}

        {notFound && (
          <>
            <Title order={1} size="h2">Profile Not Found</Title>
            <Text c="gray.5">This profile doesn't exist or has been removed.</Text>
            <Button variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} onClick={() => navigate('/')}>Create Your Own Profile</Button>
          </>
        )}

        {profile && (
          <>
            <Text
              variant="gradient"
              gradient={{ from: 'violet', to: 'cyan' }}
              fw={900}
              fz="xl"
              style={{ fontSize: 26 }}
            >
              {profile.name ? `${profile.name}'s Profile` : 'Podcast Profile'}
            </Text>

            {/* Name form — only shown until a name has been saved */}
            {!profile.name && (
              <Box w="100%" p={16} bg="gray.0" style={{ borderRadius: 8 }}>
                <Text size="sm" fw={600} mb={8} c="gray.6">
                  Set your name
                </Text>
                <Group>
                  <TextInput
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    size="sm"
                    style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  />
                  <Button
                    size="sm"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                    onClick={handleSaveName}
                    loading={savingName}
                    disabled={!nameInput.trim() || savingName}
                  >
                    Save
                  </Button>
                </Group>
              </Box>
            )}

            <Group w="100%" justify="space-between" align="center">
              <Text c="gray.5">{profile.podcasts.length} podcasts</Text>
              {enriching && (
                <Group gap={8}>
                  <Loader size="sm" />
                  <Text size="sm" c="gray.4">Loading details…</Text>
                </Group>
              )}
            </Group>

            <Button variant="gradient" gradient={{ from: 'violet', to: 'pink' }} onClick={handleShare} fullWidth>
              Share This Profile
            </Button>

            {/* ── Personality Analysis Panel ── */}
            {showAnalysisPanel && (
              <Box w="100%" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--mantine-color-gray-2)' }}>
                {/* Panel header — gradient strip */}
                <Box
                  px={20} py={12}
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <Group justify="space-between">
                    <Text fw={700} c="white">🎙️ Personality Insights</Text>
                    {analyzing && (
                      <Group gap={6}>
                        <Loader size="xs" color="white" />
                        <Text size="xs" c="white" opacity={0.8}>Analysing…</Text>
                      </Group>
                    )}
                  </Group>
                </Box>

                <Box p={20}>
                  <Stack gap={20}>

                    {/* AI Archetype card */}
                    {personality && (
                      <Box
                        p={16}
                        style={{
                          background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
                          borderRadius: 12,
                        }}
                      >
                        <Text fw={700} size="lg" mb={4}>
                          🧠 {personality.archetype}
                        </Text>
                        <Text size="sm" c="gray.8" style={{ lineHeight: 1.6 }}>
                          {personality.summary}
                        </Text>
                        {personality.listeningStyle && (
                          <Text size="xs" c="violet.7" mt={8} fs="italic">
                            🎧 {personality.listeningStyle}
                          </Text>
                        )}
                      </Box>
                    )}

                    {/* ── Category breakdown ── */}
                    {categoryRatios.length > 0 && (
                      <Box>
                        <Text fw={600} size="sm" c="gray.6" mb={12}>
                          📊 Content Mix
                        </Text>
                        <Stack gap={8}>
                          {categoryRatios.slice(0, 8).map(({ category, count, ratio }) => (
                            <Box key={category}>
                              <Group justify="space-between" mb={4}>
                                <Text size="sm">
                                  {getCategoryEmoji(category)} {category}
                                </Text>
                                <Text size="xs" c="gray.5" fw={500}>
                                  {Math.round(ratio * 100)}%{' '}
                                  <Text component="span" c="gray.4">({count})</Text>
                                </Text>
                              </Group>
                              <ProgressBar ratio={ratio} color="var(--mantine-color-blue-4)" />
                            </Box>
                          ))}
                          {categoryRatios.length > 8 && (
                            <Text size="xs" c="gray.4">
                              +{categoryRatios.length - 8} more categories
                            </Text>
                          )}
                        </Stack>
                      </Box>
                    )}

                    {/* ── Frequency / cadence ── */}
                    {Object.keys(frequencyDistribution).length > 0 && (
                      <Box>
                        <Text fw={600} size="sm" c="gray.6" mb={12}>
                          ⏱️ Content Cadence
                        </Text>
                        <Group wrap="wrap" gap={8} mb={8}>
                          {FREQUENCY_ORDER.filter(f => frequencyDistribution[f]).map(freq => (
                            <Badge
                              key={freq}
                              color={FREQUENCY_COLOR[freq] ?? 'gray'}
                              variant="light"
                              size="md"
                            >
                              {FREQUENCY_EMOJI[freq]} {frequencyDistribution[freq]} {FREQUENCY_LABEL[freq] ?? freq}
                            </Badge>
                          ))}
                        </Group>
                        {weeklyEpisodeRate > 0 && (
                          <Text size="xs" c="gray.5">
                            📬 Your library generates ~<Text component="span" fw={600}>{Math.round(weeklyEpisodeRate)}</Text> new episodes per week
                          </Text>
                        )}
                      </Box>
                    )}

                    {/* ── Big Five traits ── */}
                    {personality?.traits && (
                      <Box>
                        <Text fw={600} size="sm" c="gray.6" mb={12}>
                          🌊 Big Five Personality Traits
                        </Text>
                        <Stack gap={12}>
                          {TRAIT_ORDER.map(trait => {
                            const score = personality.traits[trait];
                            return (
                              <Box key={trait}>
                                <Group justify="space-between" mb={4}>
                                  <Text size="sm">
                                    {TRAIT_EMOJIS[trait]} {TRAIT_LABELS[trait]}
                                  </Text>
                                  <Text size="xs" c="gray.5" fw={500}>
                                    {score}%
                                  </Text>
                                </Group>
                                <ProgressBar ratio={score / 100} color={TRAIT_COLORS[trait]} />
                                {personality.traitNotes?.[trait] && (
                                  <Text size="xs" c="gray.5" mt={2} style={{ lineHeight: 1.4 }}>
                                    {personality.traitNotes[trait]}
                                  </Text>
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}

                    {/* ── Key interests ── */}
                    {personality?.interests && personality.interests.length > 0 && (
                      <Box>
                        <Text fw={600} size="sm" c="gray.6" mb={8}>
                          ✨ Key Interests
                        </Text>
                        <Group wrap="wrap" gap={8}>
                          {personality.interests.map((interest, i) => (
                            <Badge key={i} color="violet" variant="outline" size="sm">
                              {interest}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}

                  </Stack>
                </Box>
              </Box>
            )}

            {/* ── Podcast list ── */}
            <Box w="100%">
              <Stack gap={16}>
                {sortedPodcasts.map((p, i) => {
                  const meta = enriched[p.xmlurl];
                  const href = meta?.websiteUrl || undefined;
                  return (
                    <Box key={i}>
                      <Group gap={12} align="flex-start">
                        {/* Artwork */}
                        {meta?.artwork && (
                          <Box style={{ flexShrink: 0 }}>
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

                        <Box style={{ flex: 1, minWidth: 0 }}>
                          {/* Title + frequency badge */}
                          <Group justify="space-between" align="flex-start" gap={8}>
                            <Text fw={700} style={{ overflowWrap: 'anywhere' }}>
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
                                color={FREQUENCY_COLOR[meta.frequency] ?? 'gray'}
                                variant="light"
                                size="sm"
                                style={{ flexShrink: 0 }}
                              >
                                {FREQUENCY_LABEL[meta.frequency] ?? meta.frequency}
                              </Badge>
                            )}
                          </Group>

                          {/* Description */}
                          {meta?.description && (
                            <Text
                              size="sm"
                              c="gray.6"
                              mt={4}
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
                            <Group gap={4} mt={4} wrap="wrap">
                              {meta.categories.slice(0, 3).map((cat, ci) => (
                                <Badge key={ci} color="blue" variant="outline" size="sm">
                                  {cat}
                                </Badge>
                              ))}
                            </Group>
                          )}

                          {/* Latest episode */}
                          {meta?.latestEpisode?.title && (
                            <Text size="xs" c="gray.4" mt={4} truncate="end">
                              Latest: {meta.latestEpisode.title}
                              {meta.latestEpisode.date && (
                                <> · {formatRelativeDate(meta.latestEpisode.date)}</>
                              )}
                            </Text>
                          )}

                          {/* Feed URL (shown when no description loaded yet) */}
                          {!meta?.description && (
                            <Text size="xs" c="gray.4" mt={4} style={{ overflowWrap: 'anywhere' }}>
                              {p.xmlurl}
                            </Text>
                          )}
                        </Box>
                      </Group>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Button variant="subtle" onClick={() => navigate('/')}>Create Your Own Profile</Button>
          </>
        )}
      </Stack>
    </Box>
  );
}

export default ProfilePage;
