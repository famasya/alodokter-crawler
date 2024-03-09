import * as csvParse from '@fast-csv/parse';
import { createObjectCsvWriter } from 'csv-writer';
import dayjs from "dayjs";
import { createReadStream } from "fs";
import parse from 'node-html-parser';
import sanitize from "sanitize-html";
import { Logger, fetchWithRetry } from '../common';
require('dayjs/locale/id');

dayjs.extend(require('dayjs/plugin/customParseFormat'));

const logger = Logger('alodokter-contents');

(async () => {
  // read csv
  const links: any[] = await new Promise(resolve => {
    const links: any = [];
    createReadStream(`${__dirname}/all_links.csv`)
      .pipe(csvParse.parse({ headers: true }))
      .on('error', error => {
        console.error(error.message);
      })
      .on('data', row => {
        links.push(row)
      })
      .on('end', () => resolve(links))
  })

  const csv = createObjectCsvWriter({
    path: 'qna.csv',
    alwaysQuote: true,
    append: true,
    header: [
      "id",
      "title",
      "user",
      "question",
      "question_clean",
      "question_post_date",
      "answer_by",
      "answer_post_date",
      "answer",
      "answer_clean"
    ],
  });


  for (const [index, link] of links.entries()) {
    try {
      logger.info(`Visiting ${index + 1} / ${links.length}`);
      const response = await (await fetchWithRetry(link.url)).text();
      const root = parse(response);
      const question = root.querySelector('detail-topic').attributes
      const answer = root.querySelector('doctor-topic').attributes

      const questionContent = JSON.parse(question['member-topic-content']).replace(/\n/g, ' ')

      const questionContentClean = sanitize(questionContent, { allowedTags: [] }).replace(/\n{2,}/g, ' ').trim()
      const answerContent = JSON.parse(answer['doctor-topic-content']).replace(/\n/g, ' ')
      const answerContentClean = sanitize(answerContent, { allowedTags: [] }).replace(/\n{2,}/g, ' ').trim()
      const data = {
        id: question['diskusi-id'],
        title: question['member-topic-title'],
        user: question['member-username'],
        question: questionContent,
        question_clean: questionContentClean,
        question_post_date: dayjs(question['member-post-date'], 'D MMMM YYYY, HH:mm', 'id').toDate(),
        answer_by: answer['doctor-name-title'],
        answer_post_date: dayjs(answer['post-date'], 'D MMMM YYYY, HH:mm', 'id').toDate(),
        answer: answerContent,
        answer_clean: answerContentClean
      }
      await csv.writeRecords([data]);
    } catch (error) {
      logger.error(error)
    }
  }
})()
