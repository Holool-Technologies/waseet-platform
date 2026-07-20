export interface SkillLevelInfo {
  key:           string;
  label:         string;
  labelAr:       string;
  emoji:         string;
  color:         string;
  level:         number;
  nextLevelAt:   number;
  progress:      number;
}

export interface BadgeInfo {
  type:          string;
  label:         string;
  labelAr:       string;
  emoji:         string;
  description:   string;
  descriptionAr: string;
  earnedAt:      string;
}

export interface FreelancerStats {
  tasksCompleted:    number;
  tasksAwarded:      number;
  successRate:       number;
  avgDeliveryDays:   number;
  earningsRange:     string;
  uniqueClientsCount: number;
  skillsCount:       number;
  skillLevel:        SkillLevelInfo;
  badges:            BadgeInfo[];
}

export interface PublicProfile {
  userId:      string;
  title:       string;
  bio:         string;
  skills:      string[];
  isPublished: boolean;
  stats:       FreelancerStats;
  portfolio:   PortfolioItem[];
}

export interface PortfolioItem {
  itemId:    string;
  imageUrl:  string;
  caption:   string;
  status:    string;
  uploadedAt: string;
}