// Functionality for the notes pages

// Set current year in footer
document.addEventListener('DOMContentLoaded', function() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

// Theme toggle functionality (for future implementations)
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    root.classList.toggle('dark');
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', loadTheme);

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Reading progress indicator (for articles)
function initReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: var(--accent);
        z-index: 1000;
        transition: width 0.3s ease;
    `;
    
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', function() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.scrollY;
        const progress = (scrolled / documentHeight) * 100;
        
        progressBar.style.width = Math.min(progress, 100) + '%';
    });
}

// Initialize reading progress on article pages
if (document.querySelector('.article-content')) {
    document.addEventListener('DOMContentLoaded', initReadingProgress);
}

// Copy code functionality
function initCodeCopy() {
    const codeBlocks = document.querySelectorAll('.code-content pre');
    
    codeBlocks.forEach(block => {
    const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-btn';
    copyButton.textContent = 'Copy';
        copyButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--border);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        
        const container = block.closest('.code-content');
        if (container) {
            container.style.position = 'relative';
            container.appendChild(copyButton);
            
            container.addEventListener('mouseenter', () => {
                copyButton.style.opacity = '1';
            });
            
            container.addEventListener('mouseleave', () => {
                copyButton.style.opacity = '0';
            });
            
            copyButton.addEventListener('click', async () => {
                const code = block.textContent;
                
                try {
                    await navigator.clipboard.writeText(code);
                    copyButton.textContent = 'Copied!';
                    copyButton.style.background = 'var(--accent)';
                    copyButton.style.color = 'var(--accent-contrast)';
                    
                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                        copyButton.style.background = 'var(--border)';
                        copyButton.style.color = 'inherit';
                    }, 2000);
                } catch (err) {
                    console.error('Error copying code:', err);
                    copyButton.textContent = 'Error';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                    }, 2000);
                }
            });
        }
    });
}

// Initialize code copy on article pages
if (document.querySelector('.code-section')) {
    document.addEventListener('DOMContentLoaded', initCodeCopy);
}

// Table of contents generator (for long articles)
function generateTableOfContents() {
    const article = document.querySelector('.article-content');
    const headings = article.querySelectorAll('h2, h3');
    
    if (headings.length < 3) return; // Don't generate TOC for short articles
    
    const toc = document.createElement('div');
    toc.className = 'table-of-contents';
    toc.innerHTML = '<h3>Contents</h3>';
    
    const list = document.createElement('ul');
    
    headings.forEach((heading, index) => {
        const id = `heading-${index}`;
        heading.id = id;
        
        const listItem = document.createElement('li');
        listItem.className = heading.tagName.toLowerCase();
        
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = heading.textContent;
        
        listItem.appendChild(link);
        list.appendChild(listItem);
    });
    
    toc.appendChild(list);
    
    // Insert TOC after article header
    const articleHeader = document.querySelector('.article-header');
    if (articleHeader) {
        articleHeader.insertAdjacentElement('afterend', toc);
    }
}

// Initialize TOC on article pages
if (document.querySelector('.article-content')) {
    document.addEventListener('DOMContentLoaded', generateTableOfContents);
}