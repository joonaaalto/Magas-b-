javascriptexport default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { password, dataset } = req.body;
    
    // Tarkistetaan, täsmääkö käyttäjän syöttämä salasana palvelimelle suojatun salasanan kanssa
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Väärä salasana!' });
    }

    const username = 'joonaaalto';
    const repo = 'tilastot';
    const token = process.env.GITHUB_TOKEN; // Haetaan avain turvallisesti piilosta

    try {
        const fileUrl = `https://github.com{username}/${repo}/contents/index.html`;
        
        // Haetaan nykyisen index.html tiedoston SHA-tunnus
        const getRes = await fetch(fileUrl, { headers: { 'Authorization': `token ${token}` } });
        const getData = await getRes.json();
        const sha = getData.sha;
        
        // Luetaan nykyinen HTML-koodi tekstiksi ja puretaan base64-muodosta
        let fullHtml = Buffer.from(getData.content, 'base64').toString('utf-8');
        
        // Päivitetään koodin sisällä oleva dataset-lista uusilla luvuilla
        const cleanData = dataset.map(p => ({ nimi: p.nimi, o: parseInt(p.o)||0, v: parseInt(p.v)||0, m: parseInt(p.m)||0, ga: parseInt(p.ga)||0 }));
        fullHtml = fullHtml.replace(/let dataset = \[\s*[\s\S]*?\s*\];/, `let dataset = ${JSON.stringify(cleanData, null, 12)};`);

        // Lähetetään päivitetty koodi takaisin GitHubiin kaikkien suojauksien ohi
        const putRes = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Tilastopaivitys hallintapaneelista',
                content: Buffer.from(fullHtml, 'utf-8').toString('base64'),
                sha: sha
            })
        });

        if (putRes.ok) {
            return res.status(200).json({ success: true });
        } else {
            throw new Error();
        }
    } catch (err) {
        return res.status(500).json({ error: 'Tallennus epäonnistui palvelinvirheen takia.' });
    }
}
