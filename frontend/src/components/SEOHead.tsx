import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  twitterHandle?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'ResumeCraft - AI-Powered Professional Resume Builder',
  description = 'Create professional, ATS-friendly resumes with AI assistance. Real-time LaTeX editing, PDF preview, and AI-powered resume optimization.',
  keywords = 'resume builder, AI resume, professional resume, ATS friendly resume, LaTeX resume, CV builder, job application',
  image = 'https://craftairesume.netlify.app/og-image.png',
  url = 'https://craftairesume.netlify.app/',
  type = 'website',
  twitterHandle = '@craftairesume'
}) => {
  const fullTitle = title.includes('ResumeCraft') ? title : `${title} | ResumeCraft`;
  const fullUrl = url.startsWith('http') ? url : `https://craftairesume.netlify.app${url}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="ResumeCraft" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      <meta property="twitter:creator" content={twitterHandle} />
      <meta property="twitter:site" content={twitterHandle} />
    </Helmet>
  );
};

export default SEOHead;
