

\ProvidesClass{professional_resume}[2010/07/10 v0.9 Professional Resume class]

\LoadClass[12pt,letterpaper]{article} % Font size and paper type

\usepackage[parfill]{parskip} % Remove paragraph indentation
\usepackage{array} % Required for boldface (\bf and \bfseries) tabular columns
\usepackage{geometry}
\geometry{margin=0.5in} % Default margin - can be overridden
\usepackage{ifthen} % Required for ifthenelse statements
\usepackage{etoolbox} 
\usepackage{hyperref}
\usepackage{xcolor} % Required for textcolor


\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,      
    urlcolor=blue,
}

\pagestyle{empty} % Suppress page numbers

%----------------------------------------------------------------------------------------
%	HEADINGS COMMANDS: Commands for printing name and address
%----------------------------------------------------------------------------------------

\def \name#1{\def\@name{#1}} % Defines the \name command to set name
\def \@name {} % Sets \@name to empty by default

% Support for up to 6 links in 3 lines (2 per line)
\let \@addressone \relax
\let \@addresstwo \relax
\let \@addressthree \relax
\let \@addressfour \relax
\let \@addressfive \relax
\let \@addresssix \relax

% \address command can be used to set addresses (supports up to 6)
\def \address #1{
  \@ifundefined{@addresstwo}{
    \def \@addresstwo {#1}
  }{
  \@ifundefined{@addressthree}{
  \def \@addressthree {#1}
  }{
  \@ifundefined{@addressfour}{
  \def \@addressfour {#1}
  }{
  \@ifundefined{@addressfive}{
  \def \@addressfive {#1}
  }{
  \@ifundefined{@addresssix}{
  \def \@addresssix {#1}
  }{
     \def \@addressone {#1}
  }}}}}
}

% \printaddress is used to style an address line (given as input)
\def \printaddress #1{
  \begingroup
    \centerline{#1}
  \endgroup
  \par
  \addressskip
}

% \printname is used to print the name as a page header
\def \printname {
  \begingroup
    \hfil{\MakeUppercase{\namesize\bf \@name}}\hfil
    \nameskip\break
  \endgroup
}

%----------------------------------------------------------------------------------------
%	PRINT THE HEADING LINES
%----------------------------------------------------------------------------------------

\let\ori@document=\document
\renewcommand{\document}{
  \ori@document  % Begin document
  \printname % Print the name specified with \name
  \@ifundefined{@addressone}{}{ % Print the first address if specified
    \printaddress{\@addressone}}
  \@ifundefined{@addresstwo}{}{ % Print the second address if specified
    \printaddress{\@addresstwo}}
  \@ifundefined{@addressthree}{}{ % Print the third address if specified
    \printaddress{\@addressthree}}
  \@ifundefined{@addressfour}{}{ % Print the fourth address if specified
    \printaddress{\@addressfour}}
  \@ifundefined{@addressfive}{}{ % Print the fifth address if specified
    \printaddress{\@addressfive}}
  \@ifundefined{@addresssix}{}{ % Print the sixth address if specified
    \printaddress{\@addresssix}}
}

%----------------------------------------------------------------------------------------
%	SECTION FORMATTING
%----------------------------------------------------------------------------------------

% Defines the rSection environment for the large sections within the CV
\newenvironment{rSection}[1]{ % 1 input argument - section name
  %\sectionskip
  \textcolor{black}{\MakeUppercase{{\bf #1}}} % Section title - black color
  \sectionlineskip
  \textcolor{black}{\hrule} % Horizontal line - black color
  \begin{list}{}{ % List for each individual item in the section
    \setlength{\leftmargin}{0em} % Margin within the section
    \setlength{\itemsep}{0.25em} % Consistent spacing between items
    \setlength{\parsep}{0em} % No extra paragraph spacing
  }
  \item[]
}{
  \end{list}
}

% Defines the rSimpleSection environment for simple sections without gap
\newenvironment{rSimpleSection}[1]{ % 1 input argument - section name
  %\sectionskip
  \textcolor{black}{\MakeUppercase{{\bf #1}}} % Section title - black color
  \sectionlineskip
  \textcolor{black}{\hrule} % Horizontal line - black color
  \begin{list}{}{ % List for each individual item in the section
    \setlength{\leftmargin}{0em} % Margin within the section
    \setlength{\itemsep}{0.25em} % Consistent spacing between items
    \setlength{\parsep}{0em} % No extra paragraph spacing
  }
}{
  \end{list}
}

%----------------------------------------------------------------------------------------
%	WORK EXPERIENCE FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rSubsection}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
 {\bf\textcolor{black}{#1}} \hfill {#2} % Bold black company name and date on the right
 \ifthenelse{\equal{#3}{}}{}{ % If the third argument is not specified, don't print the job title and location line
  \\
  {\em #3} \hfill {\em #4} % Italic job title and location
  }\medskip
  \begin{list}{$\cdot$}{\leftmargin=0.8em} % \cdot used for bullets, no indentation
   \setlength{\itemsep}{0.3em} % Consistent spacing between bullet points
   \setlength{\parsep}{0em} % No extra paragraph spacing
  }{
  \end{list}
  \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	SKILLS FORMATTING
%----------------------------------------------------------------------------------------

% New environment for skills with bulleted categories
\newenvironment{rSkills}{
  \begin{list}{$\bullet$}{ % List for skill categories with bold bullet points
    \setlength{\leftmargin}{1.5em} % No indentation
    \setlength{\itemsep}{0.4em} % Consistent spacing between skill categories
    \setlength{\parsep}{0em} % No extra paragraph spacing
  }
}{
  \end{list}
}

%----------------------------------------------------------------------------------------
%	AWARDS FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rAward}[3]{ % 3 input arguments - award title, organization, and date
 {\bf\textcolor{black}{#1}} \hfill {#3} % Bold black award title and date on the right
 \smallskip
 \begin{list}{$\cdot$}{\leftmargin=0.8em} % \cdot used for bullets, no indentation
  \setlength{\itemsep}{0.3em} % Consistent spacing between bullet points
  \setlength{\parsep}{0em} % No extra paragraph spacing
 }{
 \end{list}
 \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	CERTIFICATIONS FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rCertification}[3]{ % 3 input arguments - certification name, issuer, and date
 {\bf\textcolor{black}{#1}}, #2 \hfill {#3} % Bold black certification name, issuer, and date on the right
 \smallskip
 \begin{list}{$\cdot$}{\leftmargin=0.8em} % \cdot used for bullets, no indentation
  \setlength{\itemsep}{0.3em} % Consistent spacing between bullet points
  \setlength{\parsep}{0em} % No extra paragraph spacing
 }{
 \end{list}
 \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	PROJECTS FORMATTING
%----------------------------------------------------------------------------------------

\usepackage{etoolbox} % Add this near your other \usepackage calls if not already

\newenvironment{rProjectWithTech}[4]{ % 4 input arguments - project name, link, date, technologies
  {\bf\textcolor{black}{#1}}%
  \ifstrempty{#2}{}{
    \hspace{0.5em}
    {\em #2} % Allow raw \href or plain text
  }
  \hfill {#3}%
  \ifstrempty{#4}{}{
    \\
    {\bf\em Technologies:} {\em #4}
  }\smallskip
  \begin{list}{$\cdot$}{\leftmargin=0.8em}
    \setlength{\itemsep}{0.3em}
    \setlength{\parsep}{0em}
  }{
  \end{list}
  \vspace{0.8em}
}


%----------------------------------------------------------------------------------------
%	EDUCATION FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rEducation}[4]{ % 4 input arguments - institution, degree/course, dates, and GPA/percentage
 {\bf\textcolor{black}{#1}} \hfill {#3}\smallskip % Bold black institution name and dates on the right
 \\
 {\em #2}\smallskip % Italic degree/course on next line
 \begin{list}{$\bullet$}{\leftmargin=1.2em} % \cdot used for bullets, no indentation
  \setlength{\itemsep}{0.25em} % Consistent spacing between bullet points
  \setlength{\parsep}{0em} % No extra paragraph spacing
  \item #4 % GPA/Percentage as bullet point
 }{
 \end{list}
 \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	WHITESPACE DEFINITIONS
%----------------------------------------------------------------------------------------

% The below commands define the whitespace after certain things in the document - they can be \smallskip, \medskip or \bigskip

% Font size for the name at the top of the document (user-overridable)
\providecommand{\namesize}{\Huge} % Size of the name at the top of the document (user-overridable)
\def\addressskip{\smallskip} % The space between the two address (or phone/email) lines
\def\sectionlineskip{\smallskip} % The space above the horizontal line for each section 
\def\nameskip{\smallskip} % The space after your name at the top
\def\sectionskip{\smallskip} % The space after the heading section 