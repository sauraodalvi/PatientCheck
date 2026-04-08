import React, { useEffect } from 'react';

interface SEOProps {
    title: string;
    description: string;
}

const SEO: React.FC<SEOProps> = ({ title, description }) => {
    useEffect(() => {
        document.title = `${title} | Lumenci`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', description);
        } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = description;
            document.head.appendChild(meta);
        }

        // JSON-LD for SoftwareApplication
        const scriptId = 'json-ld-software';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Lumenci",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "description": description,
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            }
        };

        script.text = JSON.stringify(jsonLd);

        return () => {
            // Clean up could be added here if needed for page Transitions
        };
    }, [title, description]);

    return null;
};

export default SEO;
