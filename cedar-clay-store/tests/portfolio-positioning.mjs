import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=page=>fs.readFileSync(path.join(root,page),"utf8");

test("public portfolio presents AI automation as its primary direction",()=>{
  const home=read("index.html"),about=read("about.html"),automation=read("ai-automation.html");
  assert.match(home,/<title>Roseline Igwilo \| AI Automation &amp; Business Systems<\/title>/);
  assert.match(home,/AI Automation · Primary focus/);
  assert.match(home,/with complementary Web Development, Technical SEO and On-Page SEO/);
  assert.match(about,/My primary direction is automation/);
  assert.match(automation,/PRIMARY FOCUS · AI AUTOMATION/);
  assert.match(automation,/proposed independent portfolio implementations, not completed client engagements/);
  assert.ok(home.indexOf('class="project-visual automation"')<home.indexOf('class="project-visual"'));
  assert.ok(home.indexOf('<h3>AI Automation</h3>')<home.indexOf('<h3>Web Development</h3>'));
});
test("complementary services retain working navigation and grounded portfolio demos",()=>{
  for(const page of ["index.html","about.html","ai-automation.html","coding.html",
    "technical-seo.html","on-page-seo.html","seo-audits.html","audit-lab.html"]){
      const html=read(page);
      assert.match(html,/href="ai-automation\.html"/,page+" should link to automation");
      assert.match(html,/<title>[^<]+<\/title>/,page);
  }
  assert.match(read("index.html"),/href="cedar-clay-store\/index\.html"/);
  assert.match(read("index.html"),/separate server-side backend prototypes/);
  assert.match(read("coding.html"),/separate authenticated Node backend prototype supports owner operations/);
  assert.match(read("ai-automation.html"),/not presented as a production deployment or verified client results/);
});
test("web development page showcases Cedar and Clay with working local demo destinations",()=>{
 const html=read("coding.html");
 assert.match(html,/id="cedar-project-title"/);
 for(const page of ["index.html","shop.html","order-studio.html","catalog-studio.html"]){
   assert.ok(html.includes('href="cedar-clay-store/'+page+'"'),"missing link "+page);
   assert.ok(fs.existsSync(path.join(root,"cedar-clay-store",page)),"missing target "+page);
 }
 assert.match(html,/separate authenticated Node backend prototype supports owner operations/);
});
