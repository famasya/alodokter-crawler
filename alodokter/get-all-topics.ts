import { createObjectCsvWriter } from "csv-writer";
import parse from "node-html-parser";
import sanitize from "sanitize-html";
import { fetchWithRetry, logger } from "../common";
import { topics } from "./topics";


(async () => {
  for (const topic of topics) {
    let page = 1;
    let hasMorePage = true;

    const csv = createObjectCsvWriter({
      path: 'all_links.csv',
      alwaysQuote: true,
      append: true,
      header: [
        "id",
        "title",
        "url",
        "replies",
        "answered_by_doctor",
        "answered_by_health_analyst",
        "answered_by",
        "topic",
        "content",
      ],
    });

    logger.info(`Begin crawling ${topic.permalink}`);
    while (hasMorePage) {
      try {
        logger.info(`Page ${page}`);
        const url = `https://www.alodokter.com/komunitas/topic-tag/${topic.permalink}/page/${page}`;
        const response = await (await fetchWithRetry(url)).text();
        const root = parse(response);
        const cards = root.querySelectorAll("card-topic");

        const data = cards.map((card) => {
          const attr = card.attributes;
          return {
            id: attr["id-data"],
            title: attr.title,
            url: `https://www.alodokter.com${attr.href}`,
            replies: parseInt(attr["counter-reply"]),
            answered_by_doctor: attr["answered-doctor"] === "true",
            answered_by_health_analyst:
              attr["answered-health-analyst"] === "true",
            answered_by: attr["pickup-name"],
            topic: topic.permalink,
            content: sanitize(attr.content, { allowedTags: [] }),
          };
        });

        if (data.length === 0) {
          logger.info('Zero results...')
          logger.debug({ url, response })
          break;
        }

        await csv.writeRecords(data);

        hasMorePage =
          root
            .querySelectorAll("paginate-button")
            .find((el) => el.getAttribute("next-page") !== "0") !== undefined;

        if (!hasMorePage) {
          break;
        }

        page += 1;
      } catch (error) {
        logger.error(error)
        break;
      }
    }
  }
})();
