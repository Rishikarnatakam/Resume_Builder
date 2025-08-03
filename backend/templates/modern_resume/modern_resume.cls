%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Modern Resume Class - Universal, AI-Friendly
% Version 3.0 (2024)
% Clean, simple, and future-proof
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{modern_resume}[2024/06/01 Universal, AI-friendly resume template]
\LoadClass{article}

% Packages
\RequirePackage{etoolbox}
\RequirePackage[letterpaper, margin=0.5in]{geometry}
\RequirePackage[colorlinks=true, urlcolor=linkColor]{hyperref}
\RequirePackage{fontawesome}
\RequirePackage{xcolor}
\RequirePackage[T1]{fontenc}
\RequirePackage{enumitem}
\RequirePackage{ifthen}

% Colors
\definecolor{mailColor}{RGB}{195, 60, 44}
\definecolor{globeColor}{RGB}{0, 0, 255}
\definecolor{linkedinColor}{RGB}{19, 102, 194}
\definecolor{githubColor}{RGB}{0, 0, 0}
\definecolor{phoneColor}{RGB}{50, 205, 50}
\definecolor{linkColor}{RGB}{51, 102, 187}

% Formatting
\raggedright
\pagenumbering{gobble}
\renewcommand*\familydefault{\sfdefault}
\setlist[itemize]{nosep, leftmargin=0.4in}

% Internal macro for section headers (not visible to AI)
\newcommand{\@sectionheader}[1]{%
  \vspace{1em}%
  \textcolor{black}{\MakeUppercase{\textbf{#1}}}%
  \kern 0.2em%
  \vrule depth 0.7ex height 0.2pt width 0.4em%
  \kern 0.2em%
  \leaders\hrule height 0.4pt\hfill%
  \vspace{0.3em}%
}

% Name and Contact
\newcommand{\name}[1]{\begin{center}\Huge\textbf{#1}\end{center}}
\newenvironment{icons}{\begin{center}\large\bfseries}{\end{center}}
\newcommand{\coloredMailIcon}{\textcolor{mailColor}{\faEnvelope}~}
\newcommand{\coloredPhoneIcon}{\textcolor{phoneColor}{\faPhone}~}
\newcommand{\coloredLinkedinIcon}{\textcolor{linkedinColor}{\faLinkedin}~}
\newcommand{\coloredGithubIcon}{\textcolor{githubColor}{\faGithub}~}
\newcommand{\coloredGlobeIcon}{\textcolor{globeColor}{\faGlobe}~}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% EDUCATION SECTION
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\newenvironment{educationsection}{\@sectionheader{Education}\begin{itemize}}{\end{itemize}}
\newcommand{\educationentry}[4]{%
  \item \textbf{#1} \hfill \textit{#3}\\
  \textit{#2}%
  \ifthenelse{\equal{#4}{}}{}{\\\textit{GPA: #4}}
}
% Usage:
% \begin{educationsection}
%   \educationentry{Institution}{Degree}{Dates}{GPA}
% \end{educationsection}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% WORK EXPERIENCE SECTION
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\newenvironment{workexperiencesection}{\@sectionheader{Work Experience}\begin{itemize}}{\end{itemize}}
\newcommand{\workentry}[4]{%
  \item \textbf{#1} \hfill \textit{#3}\\
  \textit{#2}\\
  #4
}
% Usage:
% \begin{workexperiencesection}
%   \workentry{Company}{Role}{Dates}{Description}
% \end{workexperiencesection}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% SKILLS SECTION
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\newenvironment{skillssection}{\@sectionheader{Skills}\begin{itemize}}{\end{itemize}}
\newcommand{\skillsentry}[1]{\item #1}
% Grouped skills command
\newcommand{\skillsgroup}[2]{\textbf{#1}: #2}
% Usage:
% \begin{skillssection}
%   \skillsentry{\skillsgroup{Programming}{C, Python, Java}}
%   \skillsentry{\skillsgroup{Cloud}{AWS, GCP, Netlify}}
%   \skillsentry{\skillsgroup{Databases}{MySQL, MongoDB}}
% \end{skillssection}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% PROJECTS SECTION
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\newenvironment{projectssection}{\@sectionheader{Projects}\begin{itemize}}{\end{itemize}}
\newcommand{\projectentry}[4]{%
  \item \textbf{#1} \hfill \textit{#2}\\
  \textit{Technologies: #3}\\
  \vspace{0.2em}%
  \begin{itemize}
  #4
  \end{itemize}
}
% Usage:
% \begin{projectssection}
%   \projectentry{Project Name}{Dates}{Technologies}{\item Description point 1\item Description point 2}
% \end{projectssection}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% UNIVERSAL SECTION (Awards, Certifications, Languages, etc.)
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\newenvironment{universalsection}[1]{\@sectionheader{#1}\begin{itemize}}{\end{itemize}}
\newcommand{\universalentry}[3]{%
  \item \textbf{#1} \hfill \textit{#2}\\
  #3
}
% Usage:
% \begin{universalsection}{Awards}
%   \universalentry{Award Title}{Date}{Description}
% \end{universalsection}

% END OF CLASS
