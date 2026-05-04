import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { preloadTrack } from '../lib/audio';
import { art, dur, fc } from '../lib/formatters';
import { useRelatedTracks } from '../lib/hooks';
import {
  Headphones,
  Loader2,
  Music,
  musicIcon14,
  pauseBlack11,
  pauseBlack22,
  playBlack11,
  playBlack22,
  Shuffle,
} from '../lib/icons';
import { useTrackPlay } from '../lib/useTrackPlay';
import { type Track, usePlayerStore } from '../stores/player';

const MixRow = React.memo(
  ({ track, queue }: { track: Track; queue: Track[] }) => {
    const navigate = useNavigate();
    const { isThis, isThisPlaying, togglePlay } = useTrackPlay(track, queue);
    const cover = art(track.artwork_url, 't200x200');

    return (
      <div
        className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ease-[var(--ease-apple)] ${
          isThis ? 'bg-accent/[0.04] ring-1 ring-accent/15' : 'hover:bg-white/[0.03]'
        }`}
        onMouseEnter={() => preloadTrack(track.urn)}
      >
        <div
          className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/[0.06] cursor-pointer"
          onClick={togglePlay}
        >
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
              {musicIcon14}
            </div>
          )}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
              isThisPlaying
                ? 'bg-black/30 opacity-100'
                : 'opacity-0 group-hover:bg-black/30 group-hover:opacity-100'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
              {isThisPlaying ? pauseBlack11 : playBlack11}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-medium text-white/85 truncate cursor-pointer hover:text-white transition-colors duration-150"
            onClick={() => navigate(`/track/${encodeURIComponent(track.urn)}`)}
          >
            {track.title}
          </p>
          <p
            className="text-[11px] text-white/40 truncate mt-0.5 cursor-pointer hover:text-white/60 transition-colors duration-150"
            onClick={() => navigate(`/user/${encodeURIComponent(track.user.urn)}`)}
          >
            {track.user.username}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-white/25 tabular-nums">{dur(track.duration)}</p>
          {track.playback_count != null && (
            <p className="text-[9px] text-white/15 mt-0.5 tabular-nums flex items-center gap-0.5 justify-end">
              <Headphones size={8} />
              {fc(track.playback_count)}
            </p>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => prev.track.urn === next.track.urn,
);
MixRow.displayName = 'MixRow';

export const MixPage = React.memo(() => {
  const { urn } = useParams<{ urn: string }>();
  const { t } = useTranslation();

  const { data: seed, isLoading: seedLoading } = useQuery({
    queryKey: ['track', urn],
    queryFn: () => api<Track>(`/tracks/${encodeURIComponent(urn!)}`),
    enabled: !!urn,
    refetchOnMount: 'always',
  });

  const { data: relatedData, isLoading: relatedLoading } = useRelatedTracks(urn, 30);
  const relatedTracks = useMemo(() => relatedData?.collection ?? [], [relatedData]);

  const queue = useMemo<Track[]>(
    () => (seed ? [seed, ...relatedTracks] : []),
    [seed, relatedTracks],
  );

  const seedUrn = seed?.urn;
  const isThisQueue = usePlayerStore(
    (s) => !!seedUrn && s.currentTrack?.urn === seedUrn && s.queue.length > 0,
  );
  const isThisPlaying = usePlayerStore(
    (s) => !!seedUrn && s.currentTrack?.urn === seedUrn && s.isPlaying,
  );

  if (seedLoading || !seed) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="text-white/15 animate-spin" />
      </div>
    );
  }

  const cover = art(seed.artwork_url, 't500x500');
  const totalDurationMs = queue.reduce((acc, x) => acc + (x.duration || 0), 0);

  const handlePlay = () => {
    const { play, pause, resume } = usePlayerStore.getState();
    if (isThisPlaying) pause();
    else if (isThisQueue) resume();
    else play(seed, queue);
  };

  const handleShuffle = () => {
    if (queue.length === 0) return;
    if (!usePlayerStore.getState().shuffle) {
      usePlayerStore.setState({ shuffle: true });
    }
    const random = queue[Math.floor(Math.random() * queue.length)];
    usePlayerStore.getState().play(random, queue);
  };

  return (
    <div className="p-6 pb-4 space-y-7">
      <section className="relative rounded-3xl overflow-hidden glass-featured">
        {cover && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={cover}
              alt=""
              className="w-full h-full object-cover scale-[1.5] blur-[100px] opacity-30 saturate-150"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgb(8,8,10)]/80 via-[rgb(8,8,10)]/55 to-[rgb(8,8,10)]/85" />
          </div>
        )}

        <div className="relative flex items-center gap-7 p-7">
          <div className="relative w-[220px] h-[220px] rounded-2xl overflow-hidden shrink-0 shadow-2xl ring-1 ring-white/[0.1]">
            {cover ? (
              <img src={cover} alt={seed.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                <Music size={48} className="text-white/15" />
              </div>
            )}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-accent text-accent-contrast text-[11px] font-extrabold tracking-wider shadow-md">
              MIX
            </div>
          </div>

          <div className="flex-1 min-w-0 py-2">
            <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.06] mb-3 uppercase tracking-wider">
              {t('mix.label')}
            </span>
            <h1 className="text-2xl font-bold text-white/95 leading-tight mb-2 line-clamp-2">
              {seed.title}
            </h1>
            <p className="text-[13px] text-white/45 mb-5">
              {t('mix.basedOn', { artist: seed.user.username })}
            </p>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handlePlay}
                disabled={queue.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-white/95 shadow-[0_0_30px_var(--color-accent-glow)] active:scale-[0.97] transition-all duration-200 ease-[var(--ease-apple)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isThisPlaying ? pauseBlack22 : playBlack22}
                {t('playlist.playAll')}
              </button>

              <button
                type="button"
                onClick={handleShuffle}
                disabled={queue.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass hover:bg-white/[0.05] text-white/60 hover:text-white/80 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <Shuffle size={16} />
                {t('playlist.shuffle')}
              </button>

              <div className="ml-2 text-[11px] text-white/35 tabular-nums">
                {t('mix.tracksCount', { count: queue.length })}
                {totalDurationMs > 0 && <> · {dur(totalDurationMs)}</>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-white/80 mb-3 px-1">{t('mix.trackList')}</h2>
        {relatedLoading && relatedTracks.length === 0 ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 size={20} className="text-white/15 animate-spin" />
          </div>
        ) : queue.length === 0 ? (
          <p className="py-6 text-[13px] text-white/30 text-center">{t('mix.empty')}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {queue.map((tr) => (
              <MixRow key={tr.urn} track={tr} queue={queue} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
MixPage.displayName = 'MixPage';
