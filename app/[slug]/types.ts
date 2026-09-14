export interface ApiMediaItem {
  id: string;
  filename: string;
  type: 'PHOTO' | 'VIDEO';
  size: number;
  uploaderName: string;
  hasThumbnail: boolean;
  createdAt: string;
}

export type ViewMode = 'grid' | 'list';
