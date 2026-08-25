import { describe, it, expect } from "vitest";
import { classifyVoiceIntent, deriveLocalAction, extractEntities, extractTargetPage, extractWakeWord } from "./localNlp";
import {
  extractOptionNumber,
  extractPhoneFromSpeech,
  convertBengaliDigitsToStandard,
  extractVoiceCommand,
  resolveVoiceProductSelection,
} from "../components/voiceAssistantHelpers";

describe("Voice NLP & Intent Classification", () => {
  it("classifies stop and silence barge-in commands", () => {
    expect(classifyVoiceIntent("stop").label).toBe("stop");
    expect(classifyVoiceIntent("be quiet").label).toBe("stop");
    expect(classifyVoiceIntent("shut up").label).toBe("stop");
    expect(classifyVoiceIntent("thamo dev").label).toBe("stop");
    expect(classifyVoiceIntent("bondho koro").label).toBe("stop");
    expect(classifyVoiceIntent("chup koro").label).toBe("stop");
  });

  it("classifies confirmation and cancellation intents", () => {
    expect(classifyVoiceIntent("yes").label).toBe("confirm");
    expect(classifyVoiceIntent("ha").label).toBe("confirm");
    expect(classifyVoiceIntent("thik ache").label).toBe("confirm");
    expect(classifyVoiceIntent("confirm").label).toBe("confirm");

    expect(classifyVoiceIntent("no").label).toBe("cancel_action");
    expect(classifyVoiceIntent("cancel").label).toBe("cancel_action");
    expect(classifyVoiceIntent("bad dao").label).toBe("cancel_action");
  });

  it("classifies repeat and explanation intents", () => {
    expect(classifyVoiceIntent("repeat").label).toBe("repeat");
    expect(classifyVoiceIntent("what did you say").label).toBe("repeat");
    expect(classifyVoiceIntent("abar bolo").label).toBe("repeat");
    expect(classifyVoiceIntent("bujhini").label).toBe("repeat");
    expect(classifyVoiceIntent("repeat that").label).toBe("repeat");
    expect(classifyVoiceIntent("say that again").label).toBe("repeat");
  });

  it("classifies page description / where am I commands", () => {
    expect(classifyVoiceIntent("where am I").label).toBe("page_description");
    expect(classifyVoiceIntent("what page is this").label).toBe("page_description");
    expect(classifyVoiceIntent("what can I do here").label).toBe("page_description");
    expect(classifyVoiceIntent("ami kothai").label).toBe("page_description");
    expect(classifyVoiceIntent("describe this page").label).toBe("page_description");
  });

  it("classifies read products commands", () => {
    expect(classifyVoiceIntent("read products").label).toBe("read_products");
    expect(classifyVoiceIntent("read the products").label).toBe("read_products");
    expect(classifyVoiceIntent("list products").label).toBe("read_products");
    expect(classifyVoiceIntent("read next product").label).toBe("read_products");
    expect(classifyVoiceIntent("next product").label).toBe("read_products");
    expect(classifyVoiceIntent("read previous product").label).toBe("read_products");
    expect(classifyVoiceIntent("product gulo bolo").label).toBe("read_products");
  });

  it("classifies go back / go forward commands", () => {
    expect(classifyVoiceIntent("go back").label).toBe("go_back");
    expect(classifyVoiceIntent("back").label).toBe("go_back");
    expect(classifyVoiceIntent("previous page").label).toBe("go_back");
    expect(classifyVoiceIntent("pechone jao").label).toBe("go_back");

    expect(classifyVoiceIntent("go forward").label).toBe("go_forward");
    expect(classifyVoiceIntent("forward").label).toBe("go_forward");
    expect(classifyVoiceIntent("next page").label).toBe("go_forward");
    expect(classifyVoiceIntent("shamne jao").label).toBe("go_forward");
  });

  it("classifies order navigation and tracking queries", () => {
    expect(classifyVoiceIntent("see my orders").label).toBe("order");
    expect(classifyVoiceIntent("where is my order").label).toBe("order");
    expect(classifyVoiceIntent("track order ORD-1002").label).toBe("order");
    expect(classifyVoiceIntent("amar order dekhao").label).toBe("order");
  });

  it("classifies search queries and extracts clean product entities", () => {
    expect(classifyVoiceIntent("search for black leather watch").label).toBe("search");
    expect(classifyVoiceIntent("find red silk saree").label).toBe("search");
    expect(classifyVoiceIntent("khujo wireless headphone").label).toBe("search");

    const action = deriveLocalAction("search for black leather watch", "voice");
    expect(action.intent).toBe("search");
    expect(action.searchQuery).toBe("black leather watch");

    const banglishAction = deriveLocalAction("khujo wireless headphone", "voice");
    expect(banglishAction.intent).toBe("search");
    expect(banglishAction.searchQuery).toBe("wireless headphone");
  });

  it("classifies conversational and greeting queries", () => {
    expect(classifyVoiceIntent("who are you").label).toBe("conversational");
    expect(classifyVoiceIntent("can you hear me").label).toBe("conversational");
    expect(classifyVoiceIntent("tumi ke").label).toBe("conversational");
    expect(classifyVoiceIntent("good morning").label).toBe("greeting");
    expect(classifyVoiceIntent("hello dev").label).toBe("wake_word");
  });

  it("classifies Bengali Unicode navigation commands via local NLP", () => {
    // Bengali cart navigation — "cart e jao" uses Banglish detected as navigate
    expect(classifyVoiceIntent("cart e jao").label).toBe("navigate");
  });

  it("extracts order IDs accurately", () => {
    const res = extractEntities("track order ORD-9876");
    expect(res.orderId).toBe("ORD-9876");
  });
});

describe("Voice Assistant Helpers & Extraction", () => {
  it("cleans wake words properly", () => {
    expect(extractVoiceCommand("hey dev search shoes")).toBe("search shoes");
    expect(extractVoiceCommand("dev, open cart")).toBe("open cart");
    expect(extractVoiceCommand("search watch")).toBe("search watch");
  });

  it("resolves numbered product selection in English and Bengali", () => {
    expect(extractOptionNumber("select 1")).toBe(1);
    expect(extractOptionNumber("option two")).toBe(2);
    expect(extractOptionNumber("choose item 3")).toBe(3);
    expect(extractOptionNumber("ek number option")).toBe(1);
    expect(extractOptionNumber("dui number")).toBe(2);
    expect(extractOptionNumber("prothom product")).toBe(1);
    expect(extractOptionNumber("১")).toBe(1);
    expect(extractOptionNumber("২")).toBe(2);
    expect(extractOptionNumber("৩")).toBe(3);
  });

  it("resolves product selection from product array", () => {
    const sampleProducts = [
      { id: 1, name: "Smart Watch", slug: "smart-watch" },
      { id: 2, name: "Leather Shoes", slug: "leather-shoes" },
      { id: 3, name: "Silk Saree", slug: "silk-saree" },
    ];

    const sel1 = resolveVoiceProductSelection("select 1", sampleProducts);
    expect(sel1?.selectedProduct?.name).toBe("Smart Watch");

    const sel2 = resolveVoiceProductSelection("option two", sampleProducts);
    expect(sel2?.selectedProduct?.name).toBe("Leather Shoes");

    const selBengali = resolveVoiceProductSelection("ek number", sampleProducts);
    expect(selBengali?.selectedProduct?.name).toBe("Smart Watch");
  });

  it("converts Bengali digits and spoken phone words to standardized phone numbers", () => {
    expect(convertBengaliDigitsToStandard("০১৭১১২২৩৩৪")).toBe("0171122334");

    const spokenPhone = "zero one seven one one two two three three four four";
    expect(extractPhoneFromSpeech(spokenPhone)).toBe("01711223344");

    const directPhone = "01812345678";
    expect(extractPhoneFromSpeech(directPhone)).toBe("01812345678");

    const banglaDigits = "০১৭৯৮৭৬৫৪৩২";
    expect(extractPhoneFromSpeech(banglaDigits)).toBe("01798765432");

    const spokenBengaliWords = "shunno ek saat ek ek dui dui teen teen char char";
    expect(extractPhoneFromSpeech(spokenBengaliWords)).toBe("01711223344");

    const embeddedPhone = "my phone number is 01712345678 please call me";
    expect(extractPhoneFromSpeech(embeddedPhone)).toBe("01712345678");

    const spacedDigits = "0 1 8 1 2 3 4 5 6 7 8";
    expect(extractPhoneFromSpeech(spacedDigits)).toBe("01812345678");
  });

  it("classifies continue and resume commands accurately", () => {
    expect(classifyVoiceIntent("continue").label).toBe("resume");
    expect(classifyVoiceIntent("resume").label).toBe("resume");
    expect(classifyVoiceIntent("proceed").label).toBe("resume");
    expect(classifyVoiceIntent("keep going").label).toBe("resume");
    expect(classifyVoiceIntent("shuru koro").label).toBe("resume");
  });

  it("classifies capabilities and feature inquiry commands", () => {
    expect(classifyVoiceIntent("what can you do").label).toBe("capabilities");
    expect(classifyVoiceIntent("how do you work").label).toBe("capabilities");
    expect(classifyVoiceIntent("tumi ki korte paro").label).toBe("capabilities");
    expect(classifyVoiceIntent("what are your features").label).toBe("capabilities");
  });

  it("classifies shopping advice and recommendation inquiries", () => {
    expect(classifyVoiceIntent("what should I buy").label).toBe("shopping_advice");
    expect(classifyVoiceIntent("give me a gift idea").label).toBe("shopping_advice");
    expect(classifyVoiceIntent("what are the best deals").label).toBe("shopping_advice");
    expect(classifyVoiceIntent("bhalo product suggest koro").label).toBe("shopping_advice");
  });

  it("resolves target pages from natural navigation phrases", () => {
    expect(extractTargetPage("take me to cart")).toBe("/cart");
    expect(extractTargetPage("open support")).toBe("/support");
    expect(extractTargetPage("go to fashion stylist")).toBe("/fashion-stylist");
    expect(extractTargetPage("see my orders")).toBe("/orders");
    expect(extractTargetPage("my profile")).toBe("/profile");
    expect(extractTargetPage("go to home")).toBe("/");
    expect(extractTargetPage("view products")).toBe("/products");
  });

  it("ensures control keywords and phone numbers are never extracted as product names", () => {
    expect(extractEntities("continue").productName).toBeUndefined();
    expect(extractEntities("resume").productName).toBeUndefined();
    expect(extractEntities("stop").productName).toBeUndefined();
    expect(extractEntities("where am i").productName).toBeUndefined();
    expect(extractEntities("01712345678").productName).toBeUndefined();
    expect(extractEntities("1").productName).toBeUndefined();
    expect(extractEntities("cart").productName).toBeUndefined();
    expect(extractEntities("support").productName).toBeUndefined();
  });

  it("extracts wake words and trailing compound commands accurately", () => {
    // Pure wake words
    const wake1 = extractWakeWord("Hey Dev");
    expect(wake1.hasWakeWord).toBe(true);
    expect(wake1.commandAfterWakeWord).toBe("");

    const wake2 = extractWakeWord("Shuno Dev");
    expect(wake2.hasWakeWord).toBe(true);
    expect(wake2.commandAfterWakeWord).toBe("");

    const wake3 = extractWakeWord("Dev");
    expect(wake3.hasWakeWord).toBe(true);
    expect(wake3.commandAfterWakeWord).toBe("");

    // Wake word + compound commands
    const compound1 = extractWakeWord("Hey Dev search leather watch");
    expect(compound1.hasWakeWord).toBe(true);
    expect(compound1.commandAfterWakeWord).toBe("search leather watch");

    const compound2 = extractWakeWord("Hi Dev where is my cart");
    expect(compound2.hasWakeWord).toBe(true);
    expect(compound2.commandAfterWakeWord).toBe("where is my cart");

    const compound3 = extractWakeWord("Shuno Dev open orders");
    expect(compound3.hasWakeWord).toBe(true);
    expect(compound3.commandAfterWakeWord).toBe("open orders");

    // Phonetic & STT variations (e.g. Chrome hearing "Dave", "Deb", "Def")
    expect(extractWakeWord("Hey Dave search shoes").hasWakeWord).toBe(true);
    expect(extractWakeWord("Hey Dave search shoes").commandAfterWakeWord).toBe("search shoes");
    expect(extractWakeWord("Hey Deb open cart").hasWakeWord).toBe(true);
    expect(extractWakeWord("Hey Deb open cart").commandAfterWakeWord).toBe("open cart");
    expect(extractWakeWord("Hey Def").hasWakeWord).toBe(true);
    expect(extractWakeWord("Hey Div").hasWakeWord).toBe(true);
    expect(extractWakeWord("Shuno Dave").hasWakeWord).toBe(true);

    // Power-on & Turn-on voice commands in Awakener Mode
    expect(extractWakeWord("turn on voice assistant").hasWakeWord).toBe(true);
    expect(extractWakeWord("turn on assistant").hasWakeWord).toBe(true);
    expect(extractWakeWord("wake up dev").hasWakeWord).toBe(true);
    expect(extractWakeWord("start voice assistant").hasWakeWord).toBe(true);
    expect(extractWakeWord("open voice").hasWakeWord).toBe(true);
    expect(extractWakeWord("dev bhai").hasWakeWord).toBe(true);
    expect(extractWakeWord("dev shuno").hasWakeWord).toBe(true);

    // Non-wake word speech (should NOT trigger)
    const nonWake1 = extractWakeWord("what is the weather today");
    expect(nonWake1.hasWakeWord).toBe(false);

    const nonWake2 = extractWakeWord("I am looking for a red shirt");
    expect(nonWake2.hasWakeWord).toBe(false);
    expect(extractWakeWord("hey everyone").hasWakeWord).toBe(false);
    expect(extractWakeWord("delivery boy").hasWakeWord).toBe(false);
  });

  it("classifies select_option commands accurately", () => {
    expect(classifyVoiceIntent("select 1").label).toBe("select_option");
    expect(classifyVoiceIntent("option 1").label).toBe("select_option");
    expect(classifyVoiceIntent("select option 1").label).toBe("select_option");
    expect(classifyVoiceIntent("option 2").label).toBe("select_option");
    expect(classifyVoiceIntent("number 1").label).toBe("select_option");
    expect(classifyVoiceIntent("choose 2").label).toBe("select_option");
    expect(classifyVoiceIntent("buy option 1").label).toBe("select_option");
    expect(classifyVoiceIntent("first one").label).toBe("select_option");
    expect(classifyVoiceIntent("1").label).toBe("select_option");
    expect(classifyVoiceIntent("2").label).toBe("select_option");
    expect(classifyVoiceIntent("ek number ta").label).toBe("select_option");
  });

  it("resolves product selection by number, ordinal, and keyword name", () => {
    const mockProducts = [
      { id: 1, name: "Nike Air Max Sneakers", slug: "nike-air-max", price: "BDT 5,000", index: 1 },
      { id: 2, name: "Silk White Panjabi", slug: "silk-white-panjabi", price: "BDT 3,200", index: 2 },
      { id: 3, name: "Black Leather Watch", slug: "black-leather-watch", price: "BDT 1,800", index: 3 },
    ];

    // Numeric and Ordinal Selection
    const sel1 = resolveVoiceProductSelection("select 1", mockProducts);
    expect(sel1?.selectedProduct.name).toBe("Nike Air Max Sneakers");
    expect(sel1?.selectedIndex).toBe(0);

    const sel2 = resolveVoiceProductSelection("option 2", mockProducts);
    expect(sel2?.selectedProduct.name).toBe("Silk White Panjabi");
    expect(sel2?.selectedIndex).toBe(1);

    const sel3 = resolveVoiceProductSelection("choose option 3", mockProducts);
    expect(sel3?.selectedProduct.name).toBe("Black Leather Watch");
    expect(sel3?.selectedIndex).toBe(2);

    const selFirst = resolveVoiceProductSelection("first one", mockProducts);
    expect(selFirst?.selectedProduct.name).toBe("Nike Air Max Sneakers");

    // Direct product title keyword matching
    const selName = resolveVoiceProductSelection("buy Silk White Panjabi", mockProducts);
    expect(selName?.selectedProduct.name).toBe("Silk White Panjabi");
  });
});
