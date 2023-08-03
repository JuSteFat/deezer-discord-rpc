import WebSocket from 'ws';
import * as Config from './Config';
import { tray } from './Tray';
import { clientId } from '../variables';
import { version } from '../../package.json';
import { status } from './DiscordWebSocket';

export async function setActivity(options: {
  client: import('discord-rpc').Client | WebSocket, albumId: number, trackId: string, playing: boolean, timeLeft: number,
  trackTitle: string, trackArtists: any, albumCover: string, albumTitle: string, app: Electron.App, songTime: number,
  type: string
}) {
  const {
    timeLeft, playing, client, albumTitle, trackArtists, trackTitle,
    albumCover, app, type, trackId
  } = options;
  const tooltipText = Config.get(app, 'tooltip_text');
  switch (tooltipText) {
    case 'app_name':
      tray.setToolTip('Deezer Discord RPC');
      break;
    case 'app_version':
      tray.setToolTip(`Version ${version}`);
      break;
    case 'app_name_and_version':
      tray.setToolTip(`Deezer Discord RPC version ${version}`);
      break;
    case 'artists_and_title':
      tray.setToolTip(`${trackArtists} - ${trackTitle}`);
      break;
    case 'title_and_artists':
      tray.setToolTip(`${trackTitle} - ${trackArtists}`);
      break;
  }
  if (!client) return;
  const isRPC = 'destroy' in client;

  if (Config.get(app, 'only_show_if_playing') && !playing) {
    if (isRPC) {
      await client.clearActivity(process.pid);
      return;
    } else {
      client.send(JSON.stringify({
        op: 3, d: {
          status, since: 0, afk: false, activities: []
        }
      }));
      return;
    }
  }

  const getTrackLink = () => {
    switch (type) {
      case 'song':
        return `https://www.deezer.com/track/${trackId}`;
      case 'episode':
        return `https://www.deezer.com/episode/${trackId}`;
    }
  }

  const button = (getTrackLink() && parseInt(trackId) > 0) ? { label: 'Play on Deezer', url: getTrackLink() } : undefined;
  if (isRPC) {
    await client.setActivity({
      details: trackTitle,
      state: trackArtists,
      largeImageKey: albumCover,
      largeImageText: albumTitle,
      instance: false,
      [timeLeft < Date.now() ? 'startTimestamp' : 'endTimestamp']: playing && timeLeft,
      buttons: button && [button]
    }).catch(() => {});
  } else {
    client.send(JSON.stringify({
      op: 3,
      d: {
        status,
        since: 0,
        afk: false,
        activities: [
          {
            type: 2,
            name: 'Deezer',
            details: trackTitle,
            state: trackArtists,
            timestamps: {
              [timeLeft < Date.now() ? 'start' : 'end']: playing && timeLeft,
            },
            application_id: clientId,
            assets: {
              large_image: albumCover && `spotify:${albumCover}`,
              large_text: albumTitle
            },
            buttons: button && [button.label],
            metadata: {
              button_urls: button && [button.url]
            }
          }
        ]
      }
    }));
  }
}
