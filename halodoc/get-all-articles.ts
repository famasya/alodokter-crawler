import { createObjectCsvWriter } from "csv-writer";
import pino from 'pino';
import sanitize from "sanitize-html";

const csv = createObjectCsvWriter({
	path: 'articles.csv',
	alwaysQuote: true,
	append: true,
	header: [
		"id",
		"title",
		"author",
		"headline",
		"summary",
		"content",
		"content_clean",
		"categories",
		"url",
		"publish_date",
	],
});

const logger = pino({
	level: 'debug',
	transport: {
		targets: [
			{
				target: 'pino/file',
				options: { destination: 'halodoc-articles.log' }
			},
			{
				target: 'pino/file',
				options: { destination: 1 }
			}
		]
	}
});


(async () => {
	let page = 22;
	let hasMorePage = true;

	while (hasMorePage) {
		logger.info(`Walking page ${page}`)
		const links: any = await (await fetch(`https://magneto.api.halodoc.com/api/cms/articles?per_page=100&page=${page}`)).json()

		const articles = [];
		for (const [index, link] of links.result.entries()) {
			const article: any = await (await fetch(`https://magneto.api.halodoc.com/api/cms/articles/slug/${link.slug}`)).json();
			logger.info(`Fetching (${index + 1} / ${links.result.length})`)
			const content = article.content.replace(/(\r?\n|\r)+/g, " ");
			articles.push({
				id: article.external_id,
				title: article.title,
				author: article.author.name,
				headline: article.headline,
				summary: article.summary,
				content: content,
				content_clean: sanitize(content, { allowedTags: [] }),
				categories: article.categories.map((cat: any) => cat.slug).join(","),
				url: `https://www.halodoc.com/artikel/${link.slug}`,
				publish_date: article.publish_date
			})
		}
		await csv.writeRecords(articles);
		await new Promise(resolve => setTimeout(resolve, 250))
		page += 1;
		hasMorePage = links.next_page;
	}
})()
