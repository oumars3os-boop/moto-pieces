import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { supabase, synchroniserCompteSupabase, enregistrerVenteSupabase, majVenteSupabase, chargerVentesSupabase } from "@/lib/supabase";
import { extraireTexteImage } from "@/lib/ocr";
import { demanderAssistantMistral } from "@/lib/mistral";
import { verifierQualiteImage } from "@/lib/imageProcessor";
import ModeRech from "@/components/ModeRech";
import HistoriqueGlobal from "@/components/HistoriqueGlobal";

// ---------- Données ----------

const CATEGORIES_DEFAUT = [
  { id: "moteur", label: "Moteur", emoji: "⚙️" },
  { id: "freinage", label: "Freinage", emoji: "🛑" },
  { id: "transmission", label: "Transmission", emoji: "⛓️" },
  { id: "electricite", label: "Électricité & Éclairage", emoji: "💡" },
  { id: "suspension", label: "Suspension", emoji: "🌀" },
  { id: "carrosserie", label: "Carrosserie", emoji: "🪞" },
  { id: "consommables", label: "Consommables", emoji: "🛢️" },
  { id: "echappement", label: "Échappement", emoji: "💨" },
  { id: "accessoires", label: "Accessoires", emoji: "🎒" },
  { id: "pneumatiques", label: "Pneumatiques", emoji: "🛞" },
];

const PRODUITS = [
  { id: 1, nom: "Kit chaîne 428H", cat: "transmission", marque: "Honda", prix: 32000, stock: 12, note: 4.5, desc: "Chaîne + pignons renforcés, résistance supérieure." },
  { id: 2, nom: "Plaquettes de frein avant", cat: "freinage", marque: "Yamaha", prix: 8500, stock: 30, note: 4.2, desc: "Jeu de 2 plaquettes, freinage puissant et silencieux." },
  { id: 3, nom: "Bougie d'allumage iridium", cat: "moteur", marque: "Suzuki", prix: 4500, stock: 45, note: 4.8, desc: "Allumage optimal, consommation réduite." },
  { id: 4, nom: "Batterie 12V 7Ah", cat: "electricite", marque: "TVS", prix: 18000, stock: 8, note: 4.0, desc: "Batterie sans entretien, démarrage fiable." },
  { id: 5, nom: "Rétroviseur gauche", cat: "carrosserie", marque: "Kawasaki", prix: 6500, stock: 15, note: 3.9, desc: "Rétroviseur d'origine, fixation universelle." },
  { id: 6, nom: "Huile moteur 4T 10W-40 (1L)", cat: "consommables", marque: "Autre", prix: 5500, stock: 60, note: 4.7, desc: "Huile semi-synthétique pour moteurs 4 temps." },
  { id: 7, nom: "Amortisseur arrière", cat: "suspension", marque: "Honda", prix: 42000, stock: 5, note: 4.3, desc: "Amortisseur à ressort réglable, confort routier." },
  { id: 8, nom: "Filtre à air", cat: "moteur", marque: "Sanya", prix: 3500, stock: 25, note: 4.1, desc: "Filtre lavable, filtration haute efficacité." },
  { id: 9, nom: "Disque de frein avant 296mm", cat: "freinage", marque: "Yamaha", prix: 27000, stock: 6, note: 4.6, desc: "Disque inox, usure réduite et stabilité au freinage." },
  { id: 10, nom: "Kit câbles (accélérateur, embrayage)", cat: "consommables", marque: "TVS", prix: 9500, stock: 18, note: 3.8, desc: "Câbles pré-graissés, remplacement facile." },
  { id: 11, nom: "Courroie de transmission", cat: "transmission", marque: "Suzuki", prix: 15000, stock: 10, note: 4.0, desc: "Courroie aramid, durée de vie prolongée." },
  { id: 12, nom: "Feu arrière LED", cat: "electricite", marque: "Autre", prix: 7500, stock: 22, note: 4.4, desc: "Feu LED universel 12V, visibilité maximale." },
  { id: 13, nom: "Plongeur GN", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Plongeur GN." },
  { id: 14, nom: "Fourche X-1", cat: "suspension", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Fourche X-1." },
  { id: 15, nom: "Verre de phare HJ110-3", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Verre de phare HJ110-3." },
  { id: 16, nom: "Deumare 110", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Deumare 110." },
  { id: 17, nom: "Deumare CG125", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Deumare CG125." },
  { id: 18, nom: "Pose à pied central X-1", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pose à pied central X-1." },
  { id: 19, nom: "Pose à pied central CG", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pose à pied central CG." },
  { id: 20, nom: "Filtre gros GN", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Filtre gros GN." },
  { id: 21, nom: "Culasse 110", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Culasse 110." },
  { id: 22, nom: "Hydraulique complet GN", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Hydraulique complet GN." },
  { id: 23, nom: "Hydraulique complet X-1", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Hydraulique complet X-1." },
  { id: 24, nom: "Pose à pied arrière X-1 complet", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pose à pied arrière X-1 complète." },
  { id: 25, nom: "Frein à pied X-1", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Frein à pied X-1." },
  { id: 26, nom: "Frein à pied GN", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Frein à pied GN." },
  { id: 27, nom: "Frein à pied Aloba", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Frein à pied Aloba." },
  { id: 28, nom: "Pion compteur Aloba", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pion compteur Aloba." },
  { id: 29, nom: "Pion compteur GN", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pion compteur GN." },
  { id: 30, nom: "Pion compteur X-1", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pion compteur X-1." },
  { id: 31, nom: "Chargeur CG", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Chargeur CG." },
  { id: 32, nom: "Pion complet X-1", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pion complet X-1." },
  { id: 33, nom: "Pion complet CG125", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pion complet CG125." },
  { id: 34, nom: "Pion complet CG150", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pion complet CG150." },
  { id: 35, nom: "Guidon complet X-1", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Guidon complet X-1." },
  { id: 36, nom: "Verre de phare X-1 New", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Verre de phare X-1 New." },
  { id: 37, nom: "Feu rouge X-1 New", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Feu rouge X-1 New." },
  { id: 38, nom: "Carénage compteur X-1", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Carénage compteur X-1." },
  { id: 39, nom: "Verre de compteur HJ110-3", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Verre de compteur HJ110-3." },
  { id: 40, nom: "Ressort de petit pied", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Ressort de petit pied." },
  { id: 41, nom: "Ressort de frein CG125", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Ressort de frein CG125." },
  { id: 42, nom: "Garde-boue HJ110-3", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Garde-boue HJ110-3." },
  { id: 43, nom: "Casque compteur HJ110-3", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Casque compteur HJ110-3." },
  { id: 44, nom: "Coffre compteur X-1 New", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Coffre compteur X-1 New." },
  { id: 45, nom: "Capot clignotant X-1 nouveau", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Capot clignotant X-1." },
  { id: 46, nom: "Clignotant avant HJ110-3", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Clignotant avant HJ110-3." },
  { id: 47, nom: "Robinet HJ110-3", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Robinet HJ110-3." },
  { id: 48, nom: "Clignotant avant X-1 New", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Clignotant avant X-1 New." },
  { id: 49, nom: "Point tournant GN", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Point tournant GN." },
  { id: 50, nom: "Cover chaîne Haojue 110", cat: "transmission", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Cover chaîne Haojue 110." },
  { id: 51, nom: "Robinet CG125", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Robinet CG125." },
  { id: 52, nom: "Robinet GN petit", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Robinet GN petit." },
  { id: 53, nom: "Levier CG150", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Levier CG150." },
  { id: 54, nom: "Porte-bagage Aloba feu noir", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Porte-bagage Aloba noir." },
  { id: 55, nom: "Porte-bagage Aloba feu blanc", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Porte-bagage Aloba blanc." },
  { id: 56, nom: "Ampoule bleue CG125 B", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Ampoule bleue CG125 B." },
  { id: 57, nom: "Ampoule bleue 110 B", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Ampoule bleue 110 B." },
  { id: 58, nom: "Garde-boue avant GN", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Garde-boue avant GN." },
  { id: 59, nom: "Garde-boue arrière GN", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Garde-boue arrière GN." },
  { id: 60, nom: "Clé de disque original", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Clé de disque originale." },
  { id: 61, nom: "Échappement X-1", cat: "echappement", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Échappement X-1." },
  { id: 62, nom: "Échappement Aloba", cat: "echappement", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Échappement Aloba." },
  { id: 63, nom: "Échappement SY-8", cat: "echappement", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Échappement SY-8." },
  { id: 64, nom: "Ampoule clignotant 12V", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Ampoule clignotant 12V." },
  { id: 65, nom: "Ampoule feu rouge 12V", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Ampoule feu rouge 12V." },
  { id: 66, nom: "Pose à pied avant TVS 180", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pose à pied avant TVS 180." },
  { id: 67, nom: "Pose à pied arrière TVS 180", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pose à pied arrière TVS 180." },
  { id: 68, nom: "Garde-boue TVS 180", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Garde-boue TVS 180." },
  { id: 69, nom: "Clignotant X-1", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Clignotant X-1." },
  { id: 70, nom: "Visière de casque (Helmet glass)", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Visière de casque." },
  { id: 71, nom: "Joint de filtre GN", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Joint (gaochoux) de filtre GN." },
  { id: 72, nom: "Rétroviseur TVS 180", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Rétroviseur TVS 180." },
  { id: 73, nom: "Rétroviseur TVS RockZ", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Rétroviseur TVS RockZ." },
  { id: 74, nom: "Petit culbuteur JK110", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Petit culbuteur JK110." },
  { id: 75, nom: "Couvre-chaîne Aloba", cat: "transmission", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Couvre-chaîne Aloba." },
  { id: 76, nom: "Cover chaîne X-1", cat: "transmission", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Cover chaîne X-1." },
  { id: 77, nom: "Bobinette CG B", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bobinette CG B." },
  { id: 78, nom: "Bobinette 110 B", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bobinette 110 B." },
  { id: 79, nom: "Joint de pose à pied HJ110-3", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Joint (gaochoux) de pose à pied HJ110-3." },
  { id: 80, nom: "Porte-bagage Sanya 8", cat: "accessoires", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Porte-bagage Sanya 8." },
  { id: 81, nom: "Jeu de direction GN", cat: "suspension", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Jeu de direction GN." },
  { id: 82, nom: "Amortisseur GN QSY", cat: "suspension", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Amortisseur GN QSY." },
  { id: 83, nom: "Amortisseur Aloba", cat: "suspension", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Amortisseur Aloba." },
  { id: 84, nom: "Rétroviseur Aloba", cat: "carrosserie", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Rétroviseur Aloba." },
  { id: 85, nom: "Bougie CG", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bougie CG." },
  { id: 86, nom: "Bougie 110", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bougie 110." },
  { id: 87, nom: "Bougie DX", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bougie DX." },
  { id: 88, nom: "Bougie TVS 180", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bougie TVS 180." },
  { id: 89, nom: "Bougie JK110", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Bougie JK110." },
  { id: 90, nom: "Pompe TVS 180", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pompe TVS 180." },
  { id: 91, nom: "Porte-disque TVS 180", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Porte-disque TVS 180." },
  { id: 92, nom: "Porte-disque complet TVS 125", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Porte-disque complet TVS 125." },
  { id: 93, nom: "Petit compteur GN", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Petit compteur GN." },
  { id: 94, nom: "Tige de frein GN", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Tige de frein GN." },
  { id: 95, nom: "Tige de frein X-1", cat: "freinage", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Tige de frein X-1." },
  { id: 96, nom: "Pneu avant 2.75-17", cat: "pneumatiques", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pneu avant 2.75-17." },
  { id: 97, nom: "Pneu arrière 3.00-17", cat: "pneumatiques", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pneu arrière 3.00-17." },
  { id: 98, nom: "Chambre à air avant", cat: "pneumatiques", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Chambre à air avant." },
  { id: 99, nom: "Chambre à air arrière", cat: "pneumatiques", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Chambre à air arrière." },
  { id: 100, nom: "Couronne", cat: "transmission", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Couronne de transmission." },
  { id: 101, nom: "Pignon de sortie de boîte", cat: "transmission", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Pignon de sortie de boîte." },
  { id: 102, nom: "Joint de culasse", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Joint de culasse." },
  { id: 103, nom: "Kit piston (piston + segments)", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Piston avec segments et axe." },
  { id: 104, nom: "Embrayage complet (jeu de disques)", cat: "transmission", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Jeu de disques d'embrayage complet." },
  { id: 105, nom: "Kick starter (levier de démarrage)", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Levier de démarrage au pied." },
  { id: 106, nom: "Régulateur de tension", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Régulateur de tension électrique." },
  { id: 107, nom: "Contacteur à clé", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Contacteur à clé (neiman)." },
  { id: 108, nom: "Klaxon 12V", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Klaxon 12V." },
  { id: 109, nom: "Antiparasite (bobine de bougie)", cat: "electricite", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Antiparasite / chapeau de bougie." },
  { id: 110, nom: "Filtre à essence", cat: "moteur", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Filtre à essence universel." },
  { id: 111, nom: "Graisse chaîne", cat: "consommables", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Aérosol de graisse pour chaîne." },
  { id: 112, nom: "Liquide de frein", cat: "consommables", marque: "Autre", prix: 0, stock: 10, note: 4.0, desc: "Liquide de frein DOT." },
];

// Catalogue standard : pièces générées automatiquement pour chaque marque ajoutée
const PIECES_STANDARDS = [
  { nom: "Bougie", cat: "moteur" },
  { nom: "Filtre à air", cat: "moteur" },
  { nom: "Filtre à essence", cat: "moteur" },
  { nom: "Filtre gros", cat: "moteur" },
  { nom: "Joint de culasse", cat: "moteur" },
  { nom: "Culasse", cat: "moteur" },
  { nom: "Kit piston", cat: "moteur" },
  { nom: "Culbuteur", cat: "moteur" },
  { nom: "Pompe à essence", cat: "moteur" },
  { nom: "Robinet d'essence", cat: "moteur" },
  { nom: "Plaquettes de frein avant", cat: "freinage" },
  { nom: "Plaquettes de frein arrière", cat: "freinage" },
  { nom: "Disque de frein", cat: "freinage" },
  { nom: "Levier de frein", cat: "freinage" },
  { nom: "Frein à pied", cat: "freinage" },
  { nom: "Tige de frein", cat: "freinage" },
  { nom: "Ressort de frein", cat: "freinage" },
  { nom: "Hydraulique complet", cat: "freinage" },
  { nom: "Porte-disque", cat: "freinage" },
  { nom: "Fourche", cat: "suspension" },
  { nom: "Amortisseur arrière", cat: "suspension" },
  { nom: "Jeu de direction", cat: "suspension" },
  { nom: "Kit chaîne", cat: "transmission" },
  { nom: "Couronne", cat: "transmission" },
  { nom: "Pignon", cat: "transmission" },
  { nom: "Couvre-chaîne", cat: "transmission" },
  { nom: "Embrayage complet", cat: "transmission" },
  { nom: "Levier d'embrayage", cat: "transmission" },
  { nom: "Phare avant", cat: "electricite" },
  { nom: "Verre de phare", cat: "electricite" },
  { nom: "Feu arrière", cat: "electricite" },
  { nom: "Clignotant avant", cat: "electricite" },
  { nom: "Clignotant arrière", cat: "electricite" },
  { nom: "Ampoule 12V", cat: "electricite" },
  { nom: "Batterie 12V", cat: "electricite" },
  { nom: "Compteur", cat: "electricite" },
  { nom: "Contacteur à clé", cat: "electricite" },
  { nom: "Régulateur de tension", cat: "electricite" },
  { nom: "Bobine d'allumage", cat: "electricite" },
  { nom: "Klaxon", cat: "electricite" },
  { nom: "Guidon complet", cat: "carrosserie" },
  { nom: "Garde-boue avant", cat: "carrosserie" },
  { nom: "Garde-boue arrière", cat: "carrosserie" },
  { nom: "Rétroviseur", cat: "carrosserie" },
  { nom: "Carénage compteur", cat: "carrosserie" },
  { nom: "Échappement", cat: "echappement" },
  { nom: "Pneu avant", cat: "pneumatiques" },
  { nom: "Pneu arrière", cat: "pneumatiques" },
  { nom: "Chambre à air avant", cat: "pneumatiques" },
  { nom: "Chambre à air arrière", cat: "pneumatiques" },
  { nom: "Pose à pied avant", cat: "accessoires" },
  { nom: "Pose à pied arrière", cat: "accessoires" },
  { nom: "Porte-bagage", cat: "accessoires" },
  { nom: "Visière de casque", cat: "accessoires" },
];

const ROLES = [
  { id: "admin", titre: "Administrateur", desc: "Propriétaire de la boutique — gère produits, prix, stocks et statistiques.", emoji: "👑" },
  { id: "secretaire", titre: "Secrétaire", desc: "Reçoit l'argent et confirme les paiements des commandes.", emoji: "💰" },
  { id: "vendeur", titre: "Vendeur", desc: "Vend les marchandises et enregistre les ventes.", emoji: "🛍️" },
  { id: "client", titre: "Client", desc: "Parcourt le catalogue et passe commande.", emoji: "🏍️" },
];

const fmt = (n) => (n > 0 ? n.toLocaleString("fr-FR") + " FCFA" : "Prix à définir");

// Reconnaissance par photo : signature visuelle (moyenne de couleurs en 8×8)
const sigImage = (src) => new Promise(resolve => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 8; c.height = 8;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, 8, 8);
    const data = ctx.getImageData(0, 0, 8, 8).data;
    const sig = [];
    for (let i = 0; i < data.length; i += 4) sig.push(data[i], data[i + 1], data[i + 2]);
    resolve(sig);
  };
  img.onerror = () => resolve(null);
  img.src = src;
});

const distanceSig = (a, b) => {
  if (!a || !b) return Infinity;
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s / a.length) / 255;
};

const Etoiles = ({ note }) => (
  <span className="text-amber-500 text-xs">{"★".repeat(Math.round(note))}{"☆".repeat(5 - Math.round(note))}</span>
);

const IconeMoto = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 inline" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M5.5 17.5h6l3-6h3M9 11h4l1.5-2.5h-4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Bouton sécurisé : maintenir appuyé (délai en ms) pour déclencher l'action
function BoutonSupprimer({ onSupprimer, label = "🗑️ Supprimer", duree = 5000, boutonClass = "" }) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  // Dès qu'on enlève le doigt, TOUT s'annule immédiatement : le compte à rebours ne peut jamais continuer seul.
  const annuler = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
  };

  const demarrer = (e) => {
    if (timerRef.current) return; // déjà en cours : on ne relance pas un deuxième compte à rebours
    // Capture du doigt : même s'il glisse un peu, le bouton garde le contrôle et l'annulation marchera toujours
    try { e?.currentTarget?.setPointerCapture?.(e.pointerId); } catch {}
    const t0 = Date.now();
    setProgress(1);
    timerRef.current = setInterval(() => {
      const p = Math.min(100, (Date.now() - t0) / duree * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setProgress(0);
        onSupprimer();
      }
    }, 50);
  };

  // Si le bouton disparaît pendant le maintien, on annule aussi
  useEffect(() => () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }, []);

  return (
    <div className="relative inline-block w-full">
      <Button className={boutonClass} size="sm" variant="ghost"
        style={{ touchAction: "none" }}
        onPointerDown={demarrer}
        onPointerUp={annuler}
        onPointerCancel={annuler}
        onPointerLeave={annuler}
        onLostPointerCapture={annuler}
        onContextMenu={e => e.preventDefault()}>
        {progress > 0 ? `⏳ ${Math.ceil((100 - progress) * duree / 100 / 1000)}s…` : label}
      </Button>
      <div className="absolute bottom-0 left-1 right-1 h-1 bg-zinc-200 rounded overflow-hidden">
        <div className="h-full bg-green-600 transition-all" style={{ width: progress + "%" }} />
      </div>
    </div>
  );
}

// ---------- Composants communs ----------

function Produit({ p, onAjout, onRetirer, admin, onEditer, categories, qteDansPanier, onNegocierPrix, elementTalkie }) {
  const [flash, setFlash] = useState(false);
  const [flashMoins, setFlashMoins] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const timerRef = useRef(null);
  const timerMoinsRef = useRef(null);
  const ajouterLocal = () => {
    if (p.stock === 0) return;
    onAjout(p);
    setFlash(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(false), 1200);
  };
  const retirerLocal = () => {
    if (!qteDansPanier) return;
    onRetirer(p);
    setFlashMoins(true);
    if (timerMoinsRef.current) clearTimeout(timerMoinsRef.current);
    timerMoinsRef.current = setTimeout(() => setFlashMoins(false), 700);
  };

  const nomBoutique = p.boutique || "MotoPièces Principal";

  return (
    <>
      <Card className="bg-white hover:shadow-lg transition-shadow flex flex-col justify-between">
        <CardContent className="p-3 sm:p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{(categories?.find(c => c.id === p.cat) || { emoji: "📦", label: "?" }).emoji} {(categories?.find(c => c.id === p.cat) || { label: "Autre" }).label}</Badge>
            <div className="flex items-center gap-1">
              {p.code && <Badge variant="outline" className="font-mono text-[9px] sm:text-[10px]">{p.code}</Badge>}
              <span className="text-[10px] sm:text-xs text-muted-foreground">{p.marque}</span>
            </div>
          </div>
          <div
            className="h-28 sm:h-32 rounded-md bg-zinc-100 flex items-center justify-center overflow-hidden border cursor-pointer hover:opacity-90 transition"
            onClick={() => setOpenDetail(true)}
          >
            {p.photo
              ? <img src={p.photo} alt={p.nom} className="w-full h-full object-contain" />
              : <IconeMoto />}
          </div>
          <div>
            <div
              className="font-semibold text-xs sm:text-sm leading-tight cursor-pointer hover:text-blue-600 transition"
              onClick={() => setOpenDetail(true)}
            >
              {p.nom}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.desc}</div>

            {/* Affichage explicite de la boutique de provenance */}
            <div className="mt-1 flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                🏪 {nomBoutique}
              </Badge>
              {elementTalkie}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <Etoiles note={p.note} />
            <span className="text-red-600 text-[10px] sm:text-xs font-semibold">
              {p.stock > 0 ? `Stock : ${p.stock}` : "Rupture"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t">
            <span className={p.prix > 0 ? "font-bold text-sm sm:text-base text-zinc-900" : "text-xs text-muted-foreground"}>{fmt(p.prix)}</span>
            {admin
              ? <Button size="sm" variant="outline" className="text-xs" onClick={() => onEditer(p)}>Modifier</Button>
              : (
                <div className="flex items-center gap-1 sm:gap-2">
                  {qteDansPanier > 0 && (
                    <>
                      <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center">×{qteDansPanier}</span>
                      <button type="button"
                        className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full border text-sm font-bold transition-all active:scale-90 ${flashMoins
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-red-100 text-red-600 border-red-300 hover:bg-red-200"}`}
                        onClick={retirerLocal}>−</button>
                    </>
                  )}
                  <Button size="sm" disabled={p.stock === 0}
                    className={`text-xs px-2 sm:px-3 h-8 sm:h-9 ${flash ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                    onClick={ajouterLocal}>
                    {flash ? "✓ Ajouté !" : "Ajouter"}
                  </Button>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Page détaillée de l'article avec provenance boutique */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="bg-white text-zinc-900 rounded-lg p-5 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{p.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="h-44 rounded-lg bg-zinc-100 border flex items-center justify-center overflow-hidden">
              {p.photo
                ? <img src={p.photo} alt={p.nom} className="w-full h-full object-contain" />
                : <IconeMoto />}
            </div>

            {/* Badge de provenance boutique */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Provenance / Vendeur</p>
                <p className="font-bold text-blue-900 text-sm">🏪 {nomBoutique}</p>
              </div>
              <Badge className="bg-blue-600 text-white text-xs">Achat Direct</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 border rounded bg-zinc-50">
                <span className="text-zinc-500 block">Marque</span>
                <span className="font-semibold text-zinc-900">{p.marque || "Universelle"}</span>
              </div>
              <div className="p-2 border rounded bg-zinc-50">
                <span className="text-zinc-500 block">Code Référence</span>
                <span className="font-mono font-semibold text-zinc-900">{p.code || "N/A"}</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 font-medium">Description du produit :</p>
              <p className="text-xs text-zinc-700 mt-0.5">{p.desc || "Aucune description détaillée disponible."}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t mt-3 gap-2">
              <div>
                <span className="text-xs text-zinc-500 block">Prix unitaire</span>
                <span className="font-bold text-lg text-blue-700">{fmt(p.prix)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={p.stock === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 font-bold"
                  onClick={() => { ajouterLocal(); setOpenDetail(false); }}
                >
                  🛒 Ajouter
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Filtres({ recherche, setRecherche, cat, setCat, marque, setMarque, marques, tri, setTri, photosCategories, photosMarques, categories }) {
  const iconeCat = (c) => photosCategories?.[c.id]
    ? <img src={photosCategories[c.id]} alt="" className="w-5 h-5 rounded object-contain border bg-zinc-100 inline-block" />
    : <span>{c.emoji}</span>;
  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
      <Input className="w-full sm:w-[220px]" placeholder="🔎 Rechercher une pièce…" value={recherche} onChange={e => setRecherche(e.target.value)} />
      <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
            <SelectItem value="toutes">🗂️ Toutes catégories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{iconeCat(c)} {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={marque} onValueChange={setMarque}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Marque" /></SelectTrigger>
          <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
            <SelectItem value="toutes">🏍️ Toutes marques</SelectItem>
            {marques.map(m => <SelectItem key={m} value={m}>{photosMarques?.[m]
              ? <img src={photosMarques[m]} alt="" className="w-5 h-5 rounded object-contain border bg-zinc-100 inline-block" />
              : <span>🏍️</span>} {m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Select value={tri} onValueChange={setTri}>
        <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Trier" /></SelectTrigger>
        <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
          <SelectItem value="pertinence">Pertinence</SelectItem>
          <SelectItem value="prix-asc">Prix croissant</SelectItem>
          <SelectItem value="prix-desc">Prix décroissant</SelectItem>
          <SelectItem value="note">Meilleures notes</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function Panier({ items, onRetirer, onVider, boutonCommande }) {
  const total = items.reduce((s, i) => s + i.p.prix * i.qte, 0);
  return (
    <div className="flex flex-col gap-3 h-full">
      <ScrollArea className="flex-1 max-h-[50vh] pr-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Le panier est vide.</p>
        ) : items.map(({ p, qte }) => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-sm border rounded-md p-2 mb-2">
            <div>
              <div className="font-medium leading-tight">{p.nom}</div>
              <div className="text-xs text-muted-foreground">{p.prix > 0 ? `${p.prix.toLocaleString("fr-FR")} FCFA × ${qte}` : "Prix à définir"}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold whitespace-nowrap">{(p.prix * qte).toLocaleString("fr-FR")}</span>
              <Button size="sm" variant="ghost" onClick={() => onRetirer(p.id)}>✕</Button>
            </div>
          </div>
        ))}
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-between font-bold">
        <span>Total</span><span>{total.toLocaleString("fr-FR")} FCFA</span>
      </div>
      {boutonCommande}
    </div>
  );
}

function LigneVente({ v, onConfirmer, onSaisirPrix, saisiePrix }) {
  const prixLigne = (it) => it.prixLigne ?? (it.p ? it.p.prix : it.prix);
  const qteLigne = (it) => it.qte || 1;
  const totalCalcule = v.items.reduce((s, it) => s + prixLigne(it) * qteLigne(it), 0);
  return (
    <Card className="bg-white mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">#{v.id} — {v.client} <span className="text-muted-foreground">({v.tel})</span></div>
            <div className="text-xs text-muted-foreground">
              par {v.vendeur}{v.date ? ` — 🗓️ ${v.date}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">{totalCalcule.toLocaleString("fr-FR")} FCFA</span>
            {v.statut === "payée"
              ? <Badge className="bg-green-600">Payée ✅</Badge>
              : v.statut === "crédit"
                ? <Badge className="bg-amber-600">Crédit 🔴</Badge>
                : <Badge variant="destructive">En attente</Badge>}
          </div>
        </div>

        <Separator className="my-2" />

        {/* Détail de chaque article avec sa photo */}
        <div className="space-y-1">
          {v.items.map((it, i) => {
            const photoArt = it.photo || (it.p && it.p.photo);
            return (
              <div key={i} className="flex items-center gap-2">
                {photoArt
                  ? <img src={photoArt} alt="" className="w-10 h-10 rounded-md object-contain border bg-zinc-100 shrink-0" />
                  : <div className="w-10 h-10 rounded-md border bg-zinc-100 flex items-center justify-center shrink-0">📦</div>}
                {saisiePrix && v.statut !== "payée" ? (
                  <Input type="number" className="flex-1 h-7 text-xs" value={prixLigne(it)}
                    onChange={e => onSaisirPrix && onSaisirPrix(v.id, i, Number(e.target.value) || 0)}
                    placeholder="Prix" />
                ) : (
                  <div className="flex-1 text-xs">
                    <span className="font-medium">{it.p ? it.p.nom : it.nom}</span>
                    <span className="text-muted-foreground"> × {qteLigne(it)}</span>
                  </div>
                )}
                <span className="text-xs font-semibold whitespace-nowrap">{(prixLigne(it) * qteLigne(it)).toLocaleString("fr-FR")} FCFA</span>
              </div>
            );
          })}
        </div>
      </CardContent>
      {onConfirmer && v.statut !== "payée" && v.statut !== "crédit" && (
        <div className="px-3 pb-3">
          {saisiePrix && v.items.some(it => !prixLigne(it)) ? (
            <Button className="w-full" disabled>💰 Confirmer le paiement</Button>
          ) : (
            <BoutonSupprimer label="💰 Confirmer le paiement (maintenir 1s)" duree={1000}
              boutonClass="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white shadow-md"
              onSupprimer={() => onConfirmer(v.id)} />
          )}
        </div>
      )}
    </Card>
  );
}

// ---------- Vue Client ----------

function VueClient({ produits, marques, creerVente, photosCategories, photosMarques, categories, onNegocierPrix, userActif, comptes }) {
  const [recherche, setRecherche] = useState("");
  const [cat, setCat] = useState("toutes");
  const [marque, setMarque] = useState("toutes");
  const [tri, setTri] = useState("pertinence");

  // Verrouillage et persistance de l'état du panier (ne revient jamais à zéro par accident)
  const [panier, setPanier] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_panier");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [infos, setInfos] = useState(null);
  const [chargementPhoto, setChargementPhoto] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("motopieces_panier", JSON.stringify(panier));
    } catch (e) {
      console.warn("Erreur de persistance du panier:", e);
    }
  }, [panier]);

  const liste = useMemo(() => {
    let l = produits.filter(p =>
      p.nom.toLowerCase().includes(recherche.toLowerCase()) &&
      (cat === "toutes" || p.cat === cat) &&
      (marque === "toutes" || p.marque === marque));
    if (tri === "prix-asc") l = [...l].sort((a, b) => a.prix - b.prix);
    if (tri === "prix-desc") l = [...l].sort((a, b) => b.prix - a.prix);
    if (tri === "note") l = [...l].sort((a, b) => b.note - a.note);
    return l;
  }, [produits, recherche, cat, marque, tri]);

  // Calcul du total verrouillé sur l'état du panier
  const total = useMemo(() => {
    return panier.reduce((s, i) => s + ((i.p?.prix || i.prix || 0) * (i.qte || 1)), 0);
  }, [panier]);

  const ajouter = (p) => setPanier(prev => {
    const ex = prev.find(i => i.p.id === p.id);
    return ex ? prev.map(i => i.p.id === p.id ? { ...i, qte: Math.min(i.qte + 1, p.stock) } : i) : [...prev, { p, qte: 1 }];
  });

  const retirer = (p) => setPanier(prev => prev
    .map(i => i.p.id === p.id ? { ...i, qte: i.qte - 1 } : i)
    .filter(i => i.qte > 0));

  // Recherche rapide en bas : par nom ou par image (Recherche automatique dès capture)
  const [modeRecherche, setModeRecherche] = useState(null); // "nom" | "image"
  const [nomRecherche, setNomRecherche] = useState("");
  const [photoRecherche, setPhotoRecherche] = useState(null);
  const [resultatsImage, setResultatsImage] = useState([]);

  // Lancement automatique du sélecteur/appareil photo dès le clic "Par image"
  const declencherCaptureAutomatique = () => {
    setModeRecherche("image");
    setTimeout(() => {
      const inputEl = document.getElementById("photo-recherche-client-auto");
      if (inputEl) inputEl.click();
    }, 100);
  };

  const handleCapturePhotoAutomatique = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setChargementPhoto(true);
    const r = new FileReader();
    r.onload = async () => {
      await chercherParImage(r.result);
      setChargementPhoto(false);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const chercherParImage = async (src) => {
    setPhotoRecherche(src);
    setResultatsImage([]);
    const avecPhoto = produits.filter(p => p.photo);
    if (!avecPhoto.length) return;
    const sig = await sigImage(src);
    const dists = await Promise.all(avecPhoto.map(async p => ({ p, d: distanceSig(sig, await sigImage(p.photo)) })));
    dists.sort((x, y) => x.d - y.d);
    setResultatsImage(dists.slice(0, 3).map(x => x.p));
  };

  const resultatsNom = nomRecherche.trim()
    ? produits.filter(p => p.nom.toLowerCase().includes(nomRecherche.trim().toLowerCase())).slice(0, 6)
    : [];

  // Conservation garantie des données du panier jusqu'à la confirmation finale
  const finaliserCommande = async () => {
    if (!panier.length) return;

    // Snapshot immuable des articles et du calcul du total AVANT réinitialisation de l'état
    const itemsSnapshot = panier.map(i => ({
      ...i.p,
      qte: i.qte,
      prixLigne: i.p.prix,
    }));
    const totalSnapshot = itemsSnapshot.reduce((sum, item) => sum + (item.prix * item.qte), 0);

    // Correctif : refuser une commande contenant un article sans prix (0 FCFA)
    if (!(totalSnapshot > 0)) return;

    const commandePayload = {
      items: itemsSnapshot,
      total: totalSnapshot,
      client: infos?.nom?.trim() || "Client",
      tel: infos?.tel?.trim() || "",
      vendeur: itemsSnapshot[0]?.boutique || "MotoPièces Principal",
    };

    // Transmission et enregistrement de la vente
    await creerVente(commandePayload);

    // Réinitialisation du panier UNIQUEMENT après enregistrement complet
    setPanier([]);
    setInfos(null);
    try {
      localStorage.removeItem("motopieces_panier");
    } catch {}
  };

  return (
    <div>
      {panier.length > 0 && (
        <div className="sticky top-0 z-40 bg-white border-b shadow-sm px-4 py-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 text-base w-full sm:w-auto">🛒 Cagnotte — {panier.length} article{panier.length > 1 ? "s" : ""} — {total.toLocaleString("fr-FR")} FCFA</Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-zinc-900 rounded-lg p-3 border shadow-xl" style={{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxWidth:"280px",width:"90%",maxHeight:"85vh",overflowY:"auto",zIndex:60}}>
              <DialogHeader><DialogTitle>Finaliser la commande</DialogTitle></DialogHeader>
              <Panier items={panier} onRetirer={id => setPanier(prev => prev.filter(i => i.p.id !== id))}
                onVider={() => setPanier([])}
                boutonCommande={
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-bold" disabled={!panier.length}
                    onClick={finaliserCommande}>Confirmer la commande</Button>
                } />              <div className="grid gap-1.5 pt-2">
                <Label>Nom</Label>
                <Input value={infos?.nom || ""} onChange={e => setInfos({ ...(infos || { tel: "" }), nom: e.target.value })} placeholder="Votre nom" />
                <Label className="pt-2">Téléphone</Label>
                <Input value={infos?.tel || ""} onChange={e => setInfos({ ...(infos || { nom: "" }), tel: e.target.value })} placeholder="+225 …" />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <Filtres recherche={recherche} setRecherche={setRecherche} cat={cat} setCat={setCat}
        marque={marque} setMarque={setMarque} marques={marques} tri={tri} setTri={setTri} photosCategories={photosCategories} photosMarques={photosMarques} categories={categories} />
      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {liste.map(p => <Produit key={p.id} p={p} onAjout={ajouter} onRetirer={retirer} categories={categories}
            qteDansPanier={panier.find(i => i.p.id === p.id)?.qte || 0}
            onNegocierPrix={onNegocierPrix}
            elementTalkie={userActif ? <TalkieClientArticle article={p} userActif={userActif} comptes={comptes} /> : null} />)}
        </div>
      </main>

      {/* Panneau de recherche (au-dessus de la barre du bas) */}
      {modeRecherche === "nom" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t shadow-lg p-3 max-h-64 overflow-auto">
          <Input autoFocus placeholder="Tapez le nom de la pièce…" value={nomRecherche}
            onChange={e => setNomRecherche(e.target.value)} />
          <div className="mt-2 space-y-1">
            {resultatsNom.map(p => (
              <button key={p.id} onClick={() => { ajouter(p); setNomRecherche(""); setModeRecherche(null); }}
                className="w-full text-left border rounded-md p-2 hover:bg-zinc-100 flex justify-between items-center gap-2">
                <span className="flex items-center gap-2">
                  {p.photo
                    ? <img src={p.photo} alt="" className="w-8 h-8 rounded object-contain border bg-zinc-100" />
                    : <span className="w-8 h-8 rounded border bg-zinc-100 flex items-center justify-center text-xs">📦</span>}
                  <span className="text-sm font-medium">{p.nom}</span>
                </span>
                <span className="text-xs">{p.prix.toLocaleString("fr-FR")} FCFA — Ajouter</span>
              </button>
            ))}
            {nomRecherche.trim() && resultatsNom.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune pièce trouvée avec ce nom.</p>
            )}
          </div>
        </div>
      )}

      {modeRecherche === "image" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-zinc-900 border-t shadow-2xl p-3 max-h-[80vh] overflow-auto">
          <ModeRech
            onCaptureAuto={async (file) => {
              setChargementPhoto(true);
              const r = new FileReader();
              r.onload = async () => {
                await chercherParImage(r.result);
                setChargementPhoto(false);
              };
              r.readAsDataURL(file);
            }}
            onFermer={() => setModeRecherche(null)}
          />

          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="photo-recherche-client-auto"
            onChange={handleCapturePhotoAutomatique}
          />

          {chargementPhoto && (
            <div className="p-3 mt-3 bg-amber-500/20 border border-amber-500/50 rounded-lg text-xs font-semibold text-amber-200 animate-pulse flex items-center justify-center gap-2">
              <span>🔍 Reconnaissance et analyse automatique en cours...</span>
            </div>
          )}

          {photoRecherche && (
            <div className="mt-3 flex items-center gap-2 bg-zinc-800 p-2 rounded-lg border border-zinc-700">
              <img src={photoRecherche} alt="" className="w-12 h-12 rounded border object-contain bg-black" />
              <span className="text-xs text-zinc-300">Article reconnu & correspondances :</span>
            </div>
          )}

          <div className="mt-2 space-y-1">
            {resultatsImage.map(p => (
              <button key={p.id} onClick={() => { ajouter(p); setPhotoRecherche(null); setResultatsImage([]); setModeRecherche(null); }}
                className="w-full text-left border border-zinc-700 bg-zinc-800 rounded-md p-2 hover:bg-zinc-700 flex justify-between items-center gap-2 text-white">
                <span className="flex items-center gap-2">
                  {p.photo && <img src={p.photo} alt="" className="w-8 h-8 rounded object-contain border bg-zinc-900" />}
                  <span className="text-sm font-medium">{p.nom}</span>
                </span>
                <span className="text-xs font-bold text-green-400">{p.prix.toLocaleString("fr-FR")} FCFA — Ajouter</span>
              </button>
            ))}
            {photoRecherche && resultatsImage.length === 0 && !chargementPhoto && (
              <p className="text-xs text-zinc-400 p-2 text-center">Aucune correspondance exacte — essayez la recherche par nom.</p>
            )}
          </div>
        </div>
      )}

      {/* Barre du bas : recherche par nom ou par image automatique */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-2 flex justify-center gap-2">
        <Button variant={modeRecherche === "nom" ? "default" : "outline"}
          className={modeRecherche === "nom" ? "ring-2 ring-blue-600 ring-offset-1 font-bold" : ""}
          onClick={() => setModeRecherche(modeRecherche === "nom" ? null : "nom")}>🔎 Par nom</Button>
        <Button variant={modeRecherche === "image" ? "default" : "outline"}
          className={modeRecherche === "image" ? "ring-2 ring-blue-600 ring-offset-1 font-bold" : ""}
          onClick={declencherCaptureAutomatique}>📷 Par image (Auto)</Button>
      </div>
    </div>
  );
}

// ---------- Vue Vendeur ----------

function VueVendeur({ produits, ventes, creerVente, categories = [], credits = [], cases = [] }) {
  const [onglet, setOnglet] = useState("vendre");
  const [photos, setPhotos] = useState([]); // [{ src, article, qte }]
  // Ajout des marchandises par le vendeur
  const [rechercheMarche, setRechercheMarche] = useState(""); // recherche dans tout le marché
  const [catMarche, setCatMarche] = useState("toutes"); // filtre par catégorie
  const [enAnalyse, setEnAnalyse] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [identification, setIdentification] = useState(null); // index de la photo à identifier
  const [mode, setMode] = useState("image"); // "image" | "code"
  const [rechercheCode, setRechercheCode] = useState("");
  const [client, setClient] = useState({ nom: "", tel: "" });
  const [vendu, setVendu] = useState(false);
  const [filtreVentes, setFiltreVentes] = useState("toutes");
  const [scanOuvert, setScanOuvert] = useState(false); // scanner caméra automatique
  const [creditActif, setCreditActif] = useState(false); // vente à crédit activée
  const [acompte, setAcompte] = useState(""); // montant déjà payé au moment de la vente
  const [derniereVenteCredit, setDerniereVenteCredit] = useState(false); // la vente envoyée était-elle à crédit ?

  // Capture automatique du scanner : la photo devient un article et est reconnue tout de suite
  const scannerCapture = (fichier) => {
    if (!fichier) return;
    const r = new FileReader();
    r.onload = () => {
      const src = r.result;
      setPhotos(prev => {
        const index = prev.length;
        reconnaitre(src, index);
        return [...prev, { src, article: null, qte: 1, reconnu: false }];
      });
      setEnAnalyse(true);
      setTimeout(() => setEnAnalyse(false), 800);
    };
    r.readAsDataURL(fichier);
  };

  const prendrePhotos = (e) => {
    const fichiers = Array.from(e.target.files || []);
    if (!fichiers.length) return;
    Promise.all(fichiers.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    }))).then(srcs => {
      setPhotos(prev => {
        const base = prev.length;
        const next = [...prev, ...srcs.map(src => ({ src, article: null, qte: 1, reconnu: false }))];
        // Reconnaissance automatique de chaque photo
        srcs.forEach((src, k) => reconnaitre(src, base + k));
        return next;
      });
      setEnAnalyse(true);
      setTimeout(() => setEnAnalyse(false), 800);
    });
    e.target.value = "";
  };

  // Reconnaissance automatique instantanée dès la capture photo : l'article est directement identifié et ajouté au panier/vente
  const reconnaitre = async (src, index) => {
    const avecPhoto = produits.filter(p => p.photo);
    const candidats = avecPhoto.length ? avecPhoto : produits;
    if (!candidats.length) return;

    try {
      const sig = await sigImage(src);
      const dists = await Promise.all(candidats.map(async p => ({
        p,
        d: p.photo ? distanceSig(sig, await sigImage(p.photo)) : 0.5
      })));
      dists.sort((x, y) => x.d - y.d);
      const best = dists[0];

      // Correctif : ne plus identifier à tort l'article comme le premier produit en cas d'échec.
      // On garde l'article seulement si une vraie correspondance photo a été trouvée.
      if (best && best.p && best.d < 0.4) {
        setPhotos(prev => prev.map((ph, j) => j === index ? { ...ph, article: best.p, reconnu: true } : ph));
      } else {
        setPhotos(prev => prev.map((ph, j) => j === index ? { ...ph, reconnu: false } : ph));
      }
    } catch (err) {
      // Échec de la reconnaissance : aucune attribution automatique (vente erronée évitée)
      setPhotos(prev => prev.map((ph, j) => j === index ? { ...ph, reconnu: false } : ph));
    }
  };

  // Articles identifiables manuellement : uniquement ceux qui ont une photo enregistrée
  const reconnaissables = useMemo(() => produits.filter(p => p.photo), [produits]);
  const resultats = useMemo(() =>
    reconnaissables.filter(p => p.nom.toLowerCase().includes(recherche.toLowerCase())).slice(0, 8),
    [reconnaissables, recherche]);

  const identifies = photos.filter(ph => ph.article);
  const totalAuto = identifies.reduce((s, ph) => s + ph.article.prix * ph.qte, 0);

  // Reconnaissance par mot-clé écrit sur la pièce (ex : « Papa »)
  const trouverParMot = (mot) => {
    const m = mot.trim().toLowerCase();
    if (!m) return null;
    return produits.find(p => (p.mots || []).some(k => k === m || k.includes(m) || m.includes(k))) || null;
  };

  const identifierParMot = (i, mot) => {
    const p = trouverParMot(mot);
    if (p) setPhotos(prev => prev.map((ph, j) => j === i ? { ...ph, article: p, reconnu: true } : ph));
  };

  const identifier = (i, p) => {
    setPhotos(prev => prev.map((ph, j) => j === i ? { ...ph, article: p } : ph));
    setIdentification(null);
    setRecherche("");
  };

  const changerQte = (i, d) => setPhotos(prev => prev.map((ph, j) => j === i ? { ...ph, qte: Math.max(1, ph.qte + d) } : ph));
  const supprimerPhoto = (i) => setPhotos(prev => prev.filter((_, j) => j !== i));

  // Vente par code : ajouter directement un article via son code ou son nom
  const resultatsCode = useMemo(() => {
    const q = rechercheCode.trim().toLowerCase();
    if (!q) return [];
    return produits.filter(p =>
      (p.code || "").toLowerCase() === q ||
      (p.code || "").toLowerCase().includes(q) ||
      p.nom.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [produits, rechercheCode]);

  const ajouterParCode = (p) => {
    setPhotos(prev => [...prev, { src: null, article: p, qte: 1 }]);
    setRechercheCode("");
  };

  const envoyer = () => {
    // Correctif : impossible d'enregistrer une vente à 0 FCFA (article sans prix défini)
    const sansPrix = identifies.filter(ph => !(ph.article.prix > 0));
    if (sansPrix.length > 0) return;
    const liste = identifies.map(ph => ({ p: ph.article, qte: ph.qte, photo: ph.src }));
    creerVente({
      items: liste,
      total: totalAuto,
      client: client.nom || "Client", tel: client.tel, vendeur: "Vendeur",
      photo: liste[0].photo,
      credit: creditActif, dejaPaye: Number(acompte) || 0,
    });
    setDerniereVenteCredit(creditActif);
    setCreditActif(false);
    setAcompte("");
    setVendu(true);
  };

  const reinitialiser = () => {
    setPhotos([]); setClient({ nom: "", tel: "" }); setVendu(false); setRecherche(""); setIdentification(null); setDerniereVenteCredit(false);
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex gap-2 flex-wrap">
        <Button variant={onglet === "vendre" ? "default" : "outline"} className={onglet === "vendre" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("vendre")}>📷 Vendre</Button>
        <Button variant={onglet === "marche" ? "default" : "outline"} className={onglet === "marche" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("marche")}>🏪 Marché ({produits.length})</Button>
        <Button variant={onglet === "ventes" ? "default" : "outline"} className={onglet === "ventes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("ventes")}>📋 Ventes ({ventes.length})</Button>
        <Button variant={onglet === "historique" ? "default" : "outline"} className={onglet === "historique" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("historique")}>📊 Historique Global</Button>
        <Button variant={onglet === "credits" ? "default" : "outline"} className={onglet === "credits" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("credits")}>💳 Crédits ({(credits || []).filter(c => c.statut !== "payé").length})</Button>
      </div>

      {/* Gros bouton unique qui réunit toutes les options de crédit : un seul endroit pour tout le crédit */}
      {onglet !== "credits" && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <Button size="lg" className="w-full py-6 text-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
            onClick={() => setOnglet("credits")}>
            💳 Espace Crédits ({(credits || []).filter(c => c.statut !== "payé").length} en cours)
          </Button>
        </div>
      )}

      {/* Onglet Crédits : suivi des ventes à crédit (les versements sont encaissés par la secrétaire) */}
      {onglet === "credits" && (
        <GestionCredits credits={credits || []} modeVendeur />
      )}

      {/* Onglet Marché : tout le stock de la boutique, en lecture seule. Seul l'admin ajoute des articles. */}
      {onglet === "marche" ? (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <Card className="bg-white"><CardContent className="p-4 space-y-3">
            <div className="font-semibold">🏪 Tout le marché — réserve de la boutique</div>
            <p className="text-xs text-muted-foreground">Cherchez un article par son nom, sa marque ou sa catégorie pour savoir s'il est en réserve et où il se trouve. Seul l'administrateur peut ajouter ou retirer des articles.</p>
            <Input placeholder="🔍 Rechercher un article (nom, marque…)" value={rechercheMarche}
              onChange={e => setRechercheMarche(e.target.value)} />
            <select className="h-10 w-full sm:w-auto rounded-md border border-zinc-300 px-3 bg-white text-sm"
              value={catMarche} onChange={e => setCatMarche(e.target.value)}>
              <option value="toutes">Toutes les catégories</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </CardContent></Card>

          <div className="font-semibold text-sm">📦 Articles en réserve ({(() => {
            const q = rechercheMarche.trim().toLowerCase();
            return produits.filter(p =>
              (catMarche === "toutes" || String(p.cat) === String(catMarche)) &&
              (!q || (p.nom || "").toLowerCase().includes(q) || (p.marque || "").toLowerCase().includes(q))
            ).length;
          })()})</div>
          {produits.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun article dans le marché pour le moment. C'est l'administrateur qui ajoute les articles.</p>
          ) : (
            <div className="space-y-2">
              {produits
                .filter(p =>
                  (catMarche === "toutes" || String(p.cat) === String(catMarche)) &&
                  (() => {
                    const q = rechercheMarche.trim().toLowerCase();
                    return !q || (p.nom || "").toLowerCase().includes(q) || (p.marque || "").toLowerCase().includes(q);
                  })())
                .map(p => {
                  const cat = (categories || []).find(c => String(c.id) === String(p.cat));
                  const caseArticle = (cases || []).find(c => c.id === p.caseId);
                  return (
                    <Card key={p.id} className="bg-white"><CardContent className="p-2 flex items-center gap-3">
                      {p.photo ? <img src={p.photo} alt="" className="w-12 h-12 object-cover rounded-md border" />
                        : <div className="w-12 h-12 bg-zinc-200 rounded-md flex items-center justify-center text-lg">📦</div>}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{p.nom}</div>
                        <div className="text-xs text-muted-foreground">
                          {(p.prix || 0).toLocaleString("fr-FR")} FCFA — Stock : {p.stock ?? 0}{p.marque ? ` — ${p.marque}` : ""}
                        </div>
                        <div className="text-xs">
                          {caseArticle
                            ? <span className="text-blue-700 font-semibold">🗄️ Case n°{caseArticle.numero} — {caseArticle.nom}</span>
                            : <span className="text-muted-foreground">🗄️ Case non indiquée</span>}
                          {cat ? <span className="text-blue-700"> — {cat.emoji} {cat.label}</span> : null}
                          {p.boutique ? <span className="text-muted-foreground"> — 📍 {p.boutique}</span> : null}
                        </div>
                      </div>
                      {(p.stock ?? 0) > 0
                        ? <Badge className="bg-green-600 shrink-0">Disponible</Badge>
                        : <Badge variant="destructive" className="shrink-0">Rupture</Badge>}
                    </CardContent></Card>
                  );
                })}
            </div>
          )}
        </div>
      ) : onglet === "vendre" ? (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Card className="bg-white">
            <CardContent className="p-6 space-y-4">
              {vendu ? (
                <div className="text-center space-y-3 py-8">
                  <div className="text-4xl">✅</div>
                  <div className="font-semibold text-lg">{derniereVenteCredit ? "Vente enregistrée à crédit 🔴" : "Vente envoyée à la secrétaire !"}</div>
                  <p className="text-sm text-muted-foreground">{derniereVenteCredit
                    ? "La marchandise est sortie et la commande est dans l'historique en « Crédit 🔴 ». La secrétaire encaisse les versements jusqu'à ce que tout soit payé."
                    : "La secrétaire confirmera le paiement dès réception de l'argent."}</p>
                  <Button onClick={reinitialiser}>📷 Nouvelle vente</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant={mode === "image" ? "default" : "outline"} className={mode === "image" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setMode("image")}>📷 Par image</Button>
                    <Button variant={mode === "code" ? "default" : "outline"} className={mode === "code" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setMode("code")}>⌨️ Par code</Button>
                  </div>

                  {mode === "code" && (
                    <div className="border rounded-md p-3 space-y-2">
                      <Label>Code ou nom de l'article</Label>
                      <Input autoFocus placeholder="Ex : ART-013 ou Bougie…" value={rechercheCode} onChange={e => setRechercheCode(e.target.value)} />
                      {resultatsCode.length > 0 && (
                        <div className="space-y-1 max-h-52 overflow-auto">
                          {resultatsCode.map(p => (
                            <button key={p.id} onClick={() => ajouterParCode(p)}
                              className="w-full text-left border rounded-md p-2 hover:bg-zinc-100 flex justify-between items-center">
                              <span className="text-sm font-medium"><Badge variant="outline" className="mr-2 font-mono">{p.code}</Badge>{p.nom}</span>
                              <span className="text-xs">{p.prix > 0 ? p.prix.toLocaleString("fr-FR") + " FCFA" : "Prix à définir"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">L'article s'ajoute directement dans la cagnotte.</p>
                    </div>
                  )}

                  {mode === "image" && (
                  <>
                  <div className="text-center space-y-2">
                    <div className="text-4xl">🔍</div>
                    <div className="font-semibold text-lg">Scanner la marchandise</div>
                    <p className="text-sm text-muted-foreground">
                      Appuyez sur le scanner et pointez la caméra sur l'objet : la photo est prise <b>automatiquement</b> et l'article est recherché tout de suite dans vos marchandises.
                    </p>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg" onClick={() => setScanOuvert(true)}>
                      🔍 Scanner un article
                    </Button>
                  </div>

                  {scanOuvert && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 overflow-auto">
                      <ModeRech onCaptureAuto={scannerCapture} onFermer={() => setScanOuvert(false)} />
                    </div>
                  )}

                  {enAnalyse && (
                    <div className="text-center space-y-1 border rounded-md p-4 bg-zinc-50">
                      <div className="text-2xl animate-pulse">🔎</div>
                      <div className="text-sm font-medium">Analyse des photos…</div>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {photos.map((ph, i) => (
                          <div key={i} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-start gap-2">
                              {ph.src
                                ? <img src={ph.src} alt="article" className="w-14 h-14 rounded-md object-contain border bg-zinc-100" />
                                : <div className="w-14 h-14 rounded-md border bg-zinc-100 flex items-center justify-center text-2xl">⌨️</div>}
                              {ph.article ? (
                                <div className="text-sm flex-1">
                                  <div className="font-medium">
                                    {ph.article.photo && <img src={ph.article.photo} alt="" className="w-7 h-7 rounded object-contain border bg-zinc-100 inline-block mr-1" />}
                                    {ph.reconnu
                                      ? <Badge className="bg-green-600 mr-1">✅ Reconnu</Badge>
                                      : null}
                                    <Badge variant="outline" className="mr-1 font-mono">{ph.article.code}</Badge>{ph.article.nom}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {ph.article.prix > 0 ? ph.article.prix.toLocaleString("fr-FR") + " FCFA" : "Prix à définir"}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 text-xs space-y-1 bg-amber-50 border border-amber-200 rounded-md p-2">
                                  <div>❓ Non reconnu — tapez le mot écrit sur la pièce (ex : « Papa ») :</div>
                                  <Input className="h-7 text-xs" placeholder="Mot écrit…"
                                    onChange={e => identifierParMot(i, e.target.value)} />
                                </div>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => supprimerPhoto(i)}>✕</Button>
                            </div>

                            {ph.article && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" onClick={() => changerQte(i, -1)}>−</Button>
                                  <span className="w-8 text-center font-semibold">{ph.qte}</span>
                                  <Button size="sm" variant="outline" onClick={() => changerQte(i, 1)}>+</Button>
                                </div>
                                <span className="font-bold text-sm">{(ph.article.prix * ph.qte).toLocaleString("fr-FR")} FCFA</span>
                              </div>
                            )}

                            {identification === i && null}
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full border-dashed py-6"
                        onClick={() => setScanOuvert(true)}>
                        🔍 Scanner un autre article
                      </Button>

                      <div className="border rounded-md p-3 bg-amber-50 space-y-3">
                        <div className="flex justify-between items-center text-sm font-medium text-amber-800">
                          <span>🧺 Cagnotte de la vente (articles cumulés)</span>
                          <span>{identifies.length}/{photos.length} identifié{identifies.length > 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total ({identifies.length} article{identifies.length > 1 ? "s" : ""})</span>
                          <span>{totalAuto.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                        {photos.some(ph => !ph.article) && (
                          <p className="text-xs text-red-600">⚠️ Identifiez toutes les photos avant d'envoyer.</p>
                        )}
                        {identifies.some(ph => !(ph.article.prix > 0)) && (
                          <p className="text-xs text-red-600">⚠️ Un ou plusieurs articles n'ont pas de prix (0 FCFA). L'admin doit fixer le prix dans l'inventaire avant la vente.</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input placeholder="Nom du client" value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} />
                          <Input placeholder="Téléphone" value={client.tel} onChange={e => setClient({ ...client, tel: e.target.value })} />
                          <Button disabled={identifies.length === 0 || photos.some(ph => !ph.article) || identifies.some(ph => !(ph.article.prix > 0))}
                            onClick={envoyer}>{creditActif ? "💳 Envoyer la vente à crédit" : "➡️ Envoyer à la secrétaire"}</Button>
                        </div>

                        {/* Vente à crédit : la marchandise sort, le client paie après, au fur et à mesure ou tout d'un coup */}
                        <div className="border-t pt-3 space-y-2">
                          <Button size="lg" className={creditActif
                            ? "w-full py-6 text-lg bg-amber-600 hover:bg-amber-700 text-white font-bold ring-2 ring-amber-600"
                            : "w-full py-6 text-lg bg-zinc-200 hover:bg-amber-100 text-zinc-800 font-bold border-2 border-dashed border-amber-400"}
                            onClick={() => setCreditActif(a => !a)}>
                            {creditActif ? "✅ Vente à crédit ACTIVÉE — le client paiera après" : "💳 Vente à crédit (le client paie après)"}
                          </Button>
                          {creditActif && (
                            <>
                              <Input type="number" placeholder="Acompte payé tout de suite (FCFA) — laisser vide si le client ne paie rien encore"
                                value={acompte} onChange={e => setAcompte(e.target.value)} />
                              <p className="text-xs text-amber-700">
                                La marchandise sort tout de suite, la commande part dans l'historique en « Crédit 🔴 ». La secrétaire encaisse les versements ; dès que tout est payé, la commande passe en « Payée ✅ » automatiquement.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : onglet === "ventes" ? (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Card className="bg-white"><CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Ventes totales</div>
              <div className="text-xl font-bold">{ventes.length}</div>
            </CardContent></Card>
            <Card className="bg-white"><CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Payées ✅</div>
              <div className="text-xl font-bold text-green-600">{ventes.filter(v => v.statut === "payée").length}</div>
            </CardContent></Card>
            <Card className="bg-white"><CardContent className="p-3">
              <div className="text-xs text-muted-foreground">En attente de paiement</div>
              <div className="text-xl font-bold text-red-600">{ventes.filter(v => v.statut !== "payée").length}</div>
            </CardContent></Card>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={filtreVentes === "toutes" ? "default" : "outline"} className={filtreVentes === "toutes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltreVentes("toutes")}>Toutes</Button>
            <Button variant={filtreVentes === "payée" ? "default" : "outline"} className={filtreVentes === "payée" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltreVentes("payée")}>Payées</Button>
            <Button variant={filtreVentes === "attente" ? "default" : "outline"} className={filtreVentes === "attente" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltreVentes("attente")}>En attente / Crédits</Button>
          </div>
          {ventes.length === 0 ? <p className="text-muted-foreground">Aucune vente enregistrée pour le moment.</p> :
            (filtreVentes === "toutes" ? ventes : ventes.filter(v => filtreVentes === "payée" ? v.statut === "payée" : v.statut !== "payée"))
              .map(v => <LigneVente key={v.id} v={v} />)}
        </div>
      ) : onglet === "historique" ? (
        <HistoriqueGlobal ventes={ventes} />
      ) : null}

      {/* Cagnotte flottante de la vente en cours */}
      {onglet === "vendre" && !vendu && identifies.length > 0 && (
        <div className="fixed bottom-4 right-4 z-30 bg-white border shadow-lg rounded-lg p-3 flex items-center gap-3">
          <div>
            <div className="text-xs text-muted-foreground">🧺 Cagnotte en cours</div>
            <div className="font-bold text-lg">{totalAuto.toLocaleString("fr-FR")} FCFA</div>
          </div>
          <Button disabled={photos.some(ph => !ph.article) || identifies.some(ph => !(ph.article.prix > 0))} onClick={envoyer}>➡️ Envoyer à la secrétaire</Button>
        </div>
      )}
    </div>
  );
}

// ---------- Vue Secrétaire ----------

// Feuille au format A4 réel pour l'impression (autoPrint : lance l'impression dès l'ouverture)
function FeuilleA4({ children, onFermer, autoPrint }) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-auto p-4 print:bg-white print:p-0 print:static">
      <style>{`@media print { .print-exclure { display: none !important; } .zone-impression { position: static !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; } }`}</style>
      <div className="zone-impression relative mx-auto bg-white shadow-2xl" style={{ width: "210mm", minHeight: "297mm", padding: "15mm", boxSizing: "border-box" }}>
        <div className="print-exclure absolute top-2 right-2 flex gap-2 z-10">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md" onClick={() => window.print()}>🖨️ Imprimer</Button>
          <Button size="sm" variant="outline" onClick={onFermer}>✕</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Petit reçu au format ticket de caisse (comme supermarché / pharmacie)
function FeuilleTicket({ children, onFermer, autoPrint }) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-auto p-4 print:bg-white print:p-0 print:static">
      <style>{`@media print { .print-exclure { display: none !important; } .zone-impression { position: static !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; border: none !important; } }`}</style>
      <div className="zone-impression mx-auto bg-white shadow-2xl border border-dashed border-zinc-300"
        style={{ width: "80mm", padding: "6mm 5mm", boxSizing: "border-box", fontFamily: "monospace" }}>
        <div className="print-exclure flex justify-between mb-2 text-sans">
          <span className="text-xs text-zinc-500">🧾 Ticket</span>
          <button className="text-xs text-zinc-500 hover:text-zinc-900" onClick={onFermer}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Tableau de toutes les pièces : total, vendues, montant, reste
function TableauPieces({ produits, ventes }) {
  const venduesDe = (p) => ventes.reduce((s, v) => s + v.items
    .filter(it => (it.p ? it.p.id : it.id) === p.id)
    .reduce((q, it) => q + (it.qte || 1), 0), 0);
  return (
    <div className="w-full">
      <table className="w-full text-[11px] sm:text-sm">
        <thead>
          <tr className="border-b bg-zinc-50 text-left">
            <th className="p-2 font-medium">Pièce</th>
            <th className="p-2 font-medium">Code</th>
            <th className="p-2 font-medium text-right">Total reçu</th>
            <th className="p-2 font-medium text-right">Vendues</th>
            <th className="p-2 font-medium text-right">Montant vendu</th>
            <th className="p-2 font-medium text-right">Reste</th>
          </tr>
        </thead>
        <tbody>
          {produits.map(p => {
            const vendues = venduesDe(p);
            const total = p.stockInit ?? p.stock;
            return (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {p.photo
                      ? <img src={p.photo} alt="" className="w-8 h-8 rounded object-contain border bg-zinc-100 shrink-0" />
                      : <div className="w-8 h-8 rounded border bg-zinc-100 flex items-center justify-center shrink-0 text-xs">📦</div>}
                    <span className="font-medium">{p.nom}</span>
                  </div>
                </td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{p.code}</td>
                <td className="p-2 text-right">{total}</td>
                <td className="p-2 text-right font-semibold text-amber-700">{vendues}</td>
                <td className="p-2 text-right font-semibold">{(vendues * p.prix).toLocaleString("fr-FR")} FCFA</td>
                <td className="p-2 text-right font-bold text-red-600">{p.stock}/{total}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-zinc-50 font-bold">
            <td className="p-2" colSpan={3}>Total</td>
            <td className="p-2 text-right text-amber-700">{produits.reduce((s, p) => s + venduesDe(p), 0)}</td>
            <td className="p-2 text-right">{produits.reduce((s, p) => s + venduesDe(p) * p.prix, 0).toLocaleString("fr-FR")} FCFA</td>
            <td className="p-2 text-right">{produits.reduce((s, p) => s + p.stock, 0)}/{produits.reduce((s, p) => s + (p.stockInit ?? p.stock), 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------- Gestion des crédits / dettes (vendeur & secrétaire) ----------
function GestionCredits({ credits, ajouterCredit, ajouterVersement, validerCredit, modeVendeur }) {
  const [vue, setVue] = useState("recevoir"); // "recevoir" : ils nous doivent | "payer" : on leur doit
  const [partie, setPartie] = useState("enregistrer"); // "enregistrer" : formulaire + tableau | "encours" : uniquement les crédits en cours, sans création
  const [filtre, setFiltre] = useState("encours"); // "encours" | "payes"
  const [ticket, setTicket] = useState(null); // crédit en cours d'impression
  const [listeImpression, setListeImpression] = useState(null); // impression de toute la liste (en cours ou payés)
  const [form, setForm] = useState({ nom: "", tel: "", montant: "" });
  const [saisie, setSaisie] = useState({}); // montant du versement en cours, par crédit

  const resteDe = (c) => Math.max(0, (c.montant || 0) - (c.versements || []).reduce((s, v) => s + (v.montant || 0), 0));
  const enCours = credits.filter(c => (c.type || "recevoir") === vue && c.statut !== "payé");
  const termines = credits.filter(c => (c.type || "recevoir") === vue && c.statut === "payé");
  const affichePayes = partie === "enregistrer" && filtre === "payes";
  const liste = affichePayes ? termines : enCours;
  const totalRestant = enCours.reduce((s, c) => s + resteDe(c), 0);
  const nbRecette = credits.filter(c => c.type === "recevoir" && c.statut !== "payé").length;
  const nbDepense = credits.filter(c => c.type === "payer" && c.statut !== "payé").length;

  const enregistrer = () => {
    const nom = form.nom.trim();
    const montant = Number(form.montant) || 0;
    if (!nom || !(montant > 0)) return;
    ajouterCredit({ type: vue, nom, tel: form.tel.trim(), montant });
    setForm({ nom: "", tel: "", montant: "" });
  };

  const verser = (c) => {
    const montant = Number(saisie[c.id]) || 0;
    if (!(montant > 0)) return;
    ajouterVersement(c.id, montant);
    // Si le versement solde le crédit, il passe automatiquement en "Payé ✅"
    const dejaPaye = (c.versements || []).reduce((s, v) => s + (v.montant || 0), 0);
    if (dejaPaye + montant >= (c.montant || 0)) validerCredit(c.id);
    setSaisie(s => ({ ...s, [c.id]: "" }));
  };

  const alerteDoublon = form.nom.trim() &&
    credits.some(c => c.statut !== "payé" && (c.nom || "").toLowerCase() === form.nom.trim().toLowerCase());

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Séparation en deux parties : d'un côté l'enregistrement et le tableau, de l'autre uniquement les crédits en cours */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={partie === "enregistrer" ? "default" : "outline"} className={partie === "enregistrer" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setPartie("enregistrer")}>📝 Enregistrer / gérer les crédits</Button>
        <Button variant={partie === "encours" ? "default" : "outline"} className={partie === "encours" ? "ring-2 ring-red-600 ring-offset-1" : ""} onClick={() => setPartie("encours")}>🔴 Crédits en cours ({enCours.length})</Button>
      </div>

      {/* Onglets : argent qu'on nous doit / argent qu'on doit */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={vue === "recevoir" ? "default" : "outline"} className={vue === "recevoir" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => { setVue("recevoir"); setFiltre("encours"); }}>💳 Ils nous doivent ({nbRecette})</Button>
        <Button variant={vue === "payer" ? "default" : "outline"} className={vue === "payer" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => { setVue("payer"); setFiltre("encours"); }}>🏦 On leur doit ({nbDepense})</Button>
      </div>

      {/* Sous-onglets (uniquement dans la partie enregistrement) : crédits en cours / crédits validés */}
      {partie === "enregistrer" && (
      <div className="flex flex-wrap gap-2 mb-4 ml-1 pl-3 border-l-4 border-zinc-300">
        <Button variant={filtre === "encours" ? "default" : "outline"} className={filtre === "encours" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("encours")}>🔴 Crédits en cours ({enCours.length})</Button>
        <Button variant={filtre === "payes" ? "default" : "outline"} className={filtre === "payes" ? "ring-2 ring-green-600 ring-offset-1" : ""} onClick={() => setFiltre("payes")}>✅ Crédits validés ({termines.length})</Button>
      </div>
      )}

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card className="bg-white"><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">{vue === "recevoir" ? "Argent à récupérer" : "Argent à verser"}</div>
          <div className="text-xl font-bold text-red-600">{totalRestant.toLocaleString("fr-FR")} FCFA</div>
        </CardContent></Card>
        <Card className="bg-white"><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Crédits en cours</div>
          <div className="text-xl font-bold text-amber-600">{enCours.length}</div>
        </CardContent></Card>
        <Card className="bg-white"><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Personnes ayant fini de payer ✅</div>
          <div className="text-xl font-bold text-green-600">{termines.length}</div>
        </CardContent></Card>
      </div>

      {/* Formulaire d'enregistrement (uniquement dans la partie « Enregistrer » ; caché pour le vendeur : lui, il vend à crédit depuis la vente) */}
      {partie === "enregistrer" && !modeVendeur && (
      <Card className="bg-white mb-4"><CardContent className="p-4 space-y-2">
        <div className="font-semibold text-sm">
          {vue === "recevoir"
            ? "➕ Enregistrer quelqu'un qui nous doit de l'argent"
            : "➕ Enregistrer une dette de l'entreprise (ex : l'administrateur doit à quelqu'un)"}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Nom de la personne" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
          <Input placeholder="Téléphone (optionnel)" value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} />
          <Input type="number" placeholder="Montant total (FCFA)" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} />
          <Button className="h-10" disabled={!form.nom.trim() || !(Number(form.montant) > 0)} onClick={enregistrer}>💾 Enregistrer le crédit</Button>
        </div>
        {alerteDoublon && (
          <p className="text-xs text-amber-600">⚠️ Cette personne a déjà un crédit en cours. Vous pouvez quand même enregistrer, mais pensez à solder l'ancien.</p>
        )}
      </CardContent></Card>
      )}

      {/* Gros bouton pour imprimer toute la liste affichée (crédits en cours ou crédits validés) */}
      {liste.length > 0 && (
        <div className="mb-4">
          <Button size="lg" className="w-full py-5 text-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
            onClick={() => setListeImpression({
              titre: affichePayes
                ? (vue === "recevoir" ? "LISTE DES CRÉDITS VALIDÉS (PAYÉS)" : "LISTE DES DETTES RÉGLÉES")
                : (vue === "recevoir" ? "LISTE DES CRÉDITS EN COURS" : "LISTE DES DETTES EN COURS"),
              items: liste,
            })}>
            🖨️ Imprimer toute la liste ({liste.length} {liste.length > 1 ? "crédits" : "crédit"}{affichePayes ? " payés" : " en cours"})
          </Button>
        </div>
      )}

      {/* Liste des crédits */}
      {liste.length === 0 && <p className="text-muted-foreground">{affichePayes ? "Aucun crédit validé pour le moment. Dès que quelqu'un finit de payer, il arrive ici automatiquement ✅" : "Aucun crédit en cours dans cette catégorie."}</p>}
      {liste.map(c => {
        const paye = (c.montant || 0) - resteDe(c);
        const reste = resteDe(c);
        const pct = (c.montant || 0) > 0 ? Math.min(100, Math.round(paye * 100 / c.montant)) : 0;
        return (
          <Card key={c.id} className="bg-white mb-2">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium">👤 {c.nom}</span>
                  {c.tel ? <span className="text-muted-foreground"> — 📞 {c.tel}</span> : null}
                  <div className="text-xs text-muted-foreground">Créé le {c.dateCreation || "—"}{c.enregistrePar ? ` par ${c.enregistrePar}` : ""}</div>
                  {c.statut === "payé" && <div className="text-xs font-semibold text-green-700">✅ Validé le {c.dateValidation || "—"}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setTicket(c)}>🖨️ Ticket</Button>
                  <span className="font-bold whitespace-nowrap">{(c.montant || 0).toLocaleString("fr-FR")} FCFA</span>
                  {c.statut === "payé"
                    ? <Badge className="bg-green-600">Payé ✅</Badge>
                    : <Badge variant="destructive">En cours</Badge>}
                </div>
              </div>

              {/* Lien vers la commande à crédit d'origine */}
              {c.venteId && (
                <div className="text-xs text-muted-foreground">🛒 Commande à crédit n°{c.venteId} — marchandise déjà sortie</div>
              )}

              {/* Progression du paiement */}
              <div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all" style={{ width: pct + "%" }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-green-700 font-semibold">Payé : {paye.toLocaleString("fr-FR")} FCFA</span>
                  <span className="text-red-600 font-semibold">Reste : {reste.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>

              {/* Historique des versements */}
              {(c.versements || []).length > 0 && (
                <div className="text-xs text-muted-foreground border-t pt-1">
                  {c.versements.map((v, i) => (
                    <div key={i} className="flex justify-between">
                      <span>💵 {v.montant.toLocaleString("fr-FR")} FCFA — {v.date}{v.par ? ` (${v.par})` : ""}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions : versement (partiel ou total). Quand la totalité est atteinte, le crédit bascule AUTOMATIQUEMENT dans « ✅ Crédits validés » */ }
              {c.statut !== "payé" && modeVendeur && (
                <p className="text-xs text-muted-foreground">La secrétaire encaisse les versements et confirme le paiement.</p>
              )}
              {c.statut !== "payé" && !modeVendeur && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input type="number" placeholder="Montant reçu / versé" value={saisie[c.id] || ""} className="flex-1 h-9"
                    onChange={e => setSaisie(s => ({ ...s, [c.id]: e.target.value }))} />
                  <Button className="h-9 bg-blue-600 hover:bg-blue-700 text-white" disabled={!(Number(saisie[c.id]) > 0)} onClick={() => verser(c)}>
                    {vue === "recevoir" ? "💰 Encaisser" : "💸 Payer"} (une partie ou tout)
                  </Button>
                  <span className="text-[11px] text-muted-foreground self-center">Dès que la totalité est atteinte, le crédit part automatiquement dans « ✅ Crédits validés »</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Impression de toute la liste des clients / crédits (en cours ou payés) */}
      {listeImpression && (
        <FeuilleTicket onFermer={() => setListeImpression(null)} autoPrint={true}>
          <div className="text-center font-bold text-sm">MotoPièces</div>
          <div className="text-center text-[10px] mb-1">{listeImpression.titre}</div>
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-[10px] mb-1">
            Date : {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-[11px] leading-snug">
            {listeImpression.items.map((c, i) => {
              const reste = resteDe(c);
              const paye = (c.montant || 0) - reste;
              return (
                <div key={c.id || i} style={{ borderBottom: "1px dotted #d4d4d4", padding: "2px 0" }}>
                  <div className="flex justify-between font-semibold">
                    <span>{i + 1}. {c.nom}{c.tel ? ` — ${c.tel}` : ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total : {(c.montant || 0).toLocaleString("fr-FR")} F</span>
                    <span>Payé : {paye.toLocaleString("fr-FR")} F</span>
                    <span className="font-bold">Reste : {reste.toLocaleString("fr-FR")} F</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-[11px] font-bold">
            <div className="flex justify-between"><span>Nombre de clients</span><span>{listeImpression.items.length}</span></div>
            <div className="flex justify-between"><span>Total général</span><span>{listeImpression.items.reduce((s, c) => s + (c.montant || 0), 0).toLocaleString("fr-FR")} F</span></div>
            <div className="flex justify-between"><span>Total déjà payé</span><span>{listeImpression.items.reduce((s, c) => s + ((c.montant || 0) - resteDe(c)), 0).toLocaleString("fr-FR")} F</span></div>
            <div className="flex justify-between"><span className="font-bold">Total reste à payer</span><span className="font-bold">{listeImpression.items.reduce((s, c) => s + resteDe(c), 0).toLocaleString("fr-FR")} F</span></div>
          </div>
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-center text-[9px]">Document imprimé depuis MotoPièces</div>
        </FeuilleTicket>
      )}

      {/* Ticket de crédit imprimable (petit ticket à donner au client pour prouver ce qu'il doit) */}
      {ticket && (
        <FeuilleTicket onFermer={() => setTicket(null)} autoPrint={true}>
          <div className="text-center font-bold text-sm">MotoPièces</div>
          <div className="text-center text-[10px] mb-1">{ticket.type === "payer" ? "REÇU DE DETTE DE L'ENTREPRISE" : "TICKET DE CRÉDIT"}</div>
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-[11px] leading-relaxed">
            Date : {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}<br />
            Créé le : {ticket.dateCreation || "—"}<br />
            {ticket.dateValidation ? <>Validé le : {ticket.dateValidation}<br /></> : null}
            {ticket.type === "payer" ? "Bénéficiaire : " : "Client : "}<span className="font-bold">{ticket.nom}</span><br />
            {ticket.tel ? <>Tél : {ticket.tel}<br /></> : null}
          </div>
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-[11px]">
            <div className="flex justify-between"><span>Montant total</span><span>{(ticket.montant || 0).toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between"><span>Déjà payé</span><span>{((ticket.montant || 0) - resteDe(ticket)).toLocaleString("fr-FR")} FCFA</span></div>
            <div className="flex justify-between font-bold"><span>Reste à payer</span><span>{resteDe(ticket).toLocaleString("fr-FR")} FCFA</span></div>
          </div>
          {(ticket.versements || []).length > 0 && (
            <div className="text-[10px] mt-1">
              <div className="border-t border-dashed border-zinc-400 my-1" />
              {ticket.versements.map((v, i) => (
                <div key={i} className="flex justify-between"><span>{v.date}</span><span>+{v.montant.toLocaleString("fr-FR")}</span></div>
              ))}
            </div>
          )}
          <div className="border-t border-dashed border-zinc-400 my-1" />
          <div className="text-center text-[11px] font-bold">
            {ticket.statut === "payé" ? "PAYÉ EN TOTALITÉ ✅ — Merci !" : "EN COURS DE PAIEMENT 🔴"}
          </div>
          <div className="text-center text-[9px] mt-1">{ticket.statut === "payé" ? "Ce crédit est entièrement soldé." : "Ce ticket atteste de la somme restant à payer."}</div>
          <div className="text-center text-[10px] mt-2">* * *</div>
        </FeuilleTicket>
      )}
    </div>
  );
}

function VueSecretaire({ ventes, confirmerPaiement, majPrixLigne, modePrix, entreprise, credits, ajouterCredit, ajouterVersement, validerCredit }) {
  const [ongletSec, setOngletSec] = useState("paiements"); // "paiements" | "credits"
  const [filtre, setFiltre] = useState("toutes");
  const [questionRecu, setQuestionRecu] = useState(null); // après paiement : propose l'impression du reçu
  const [recuA4, setRecuA4] = useState(null); // reçu affiché en feuille A4
  const liste = ventes.filter(v => v.statut !== "crédit" && (filtre === "toutes" ? true : v.statut === filtre)); // les ventes à crédit sont gérées uniquement dans l'onglet Crédits
  const totalCalcule = (v) => v.items.reduce((s, it) => s + (it.prixLigne ?? (it.p ? it.p.prix : it.prix)) * (it.qte || 1), 0);
  const totalPaye = ventes.filter(v => v.statut === "payée").reduce((s, v) => s + totalCalcule(v), 0);
  const totalAttente = ventes.filter(v => v.statut === "en attente").reduce((s, v) => s + totalCalcule(v), 0);
  const saisie = modePrix === "secretaire";

  const confirmerEtProposer = (id) => {
    confirmerPaiement(id);
    const v = ventes.find(x => x.id === id);
    if (v) setQuestionRecu({ ...v, statut: "payée", total: totalCalcule(v) });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Espace secrétaire : paiements des ventes ou gestion des crédits */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={ongletSec === "paiements" ? "default" : "outline"} className={ongletSec === "paiements" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOngletSec("paiements")}>🧾 Paiements des ventes</Button>
        <Button variant={ongletSec === "credits" ? "default" : "outline"} className={ongletSec === "credits" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOngletSec("credits")}>💳 Crédits / Dettes ({(credits || []).filter(c => c.statut !== "payé").length})</Button>
      </div>

      {/* Gros bouton unique qui réunit toutes les options de crédit : un seul endroit pour tout le crédit */}
      {ongletSec !== "credits" && (
        <Button size="lg" className="w-full mb-4 py-6 text-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
          onClick={() => setOngletSec("credits")}>
          💳 Espace Crédits ({(credits || []).filter(c => c.statut !== "payé").length} en cours)
        </Button>
      )}
      {ongletSec === "credits" ? (
        <GestionCredits credits={credits || []} ajouterCredit={ajouterCredit} ajouterVersement={ajouterVersement} validerCredit={validerCredit} />
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Card className="bg-white"><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Argent encaissé</div>
          <div className="text-2xl font-bold text-green-600">{totalPaye.toLocaleString("fr-FR")} FCFA</div>
        </CardContent></Card>
        <Card className="bg-white"><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">En attente de paiement</div>
          <div className="text-2xl font-bold text-red-600">{totalAttente.toLocaleString("fr-FR")} FCFA</div>
        </CardContent></Card>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={filtre === "toutes" ? "default" : "outline"} className={filtre === "toutes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("toutes")}>Toutes ({ventes.filter(v => v.statut !== "crédit").length})</Button>
        <Button variant={filtre === "attente" ? "default" : "outline"} className={filtre === "attente" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("attente")}>En attente ({ventes.filter(v => v.statut === "en attente").length})</Button>
        <Button variant={filtre === "payée" ? "default" : "outline"} className={filtre === "payée" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("payée")}>Payées ({ventes.filter(v => v.statut === "payée").length})</Button>
      </div>
      {/* Les ventes à crédit ne passent PAS ici : elles sont encaissées uniquement dans l'onglet « 💳 Crédits / Dettes » */}
      {ventes.some(v => v.statut === "crédit") && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
          💳 {ventes.filter(v => v.statut === "crédit").length} vente{ventes.filter(v => v.statut === "crédit").length > 1 ? "s" : ""} à crédit en cours : l'encaissement des versements se fait uniquement dans l'onglet « 💳 Crédits / Dettes ».
        </p>
      )}
      {liste.length === 0 ? <p className="text-muted-foreground">Aucune vente dans cette catégorie.</p> : liste.map(v => (
        <LigneVente key={v.id} v={v} onConfirmer={confirmerEtProposer}
          saisiePrix={saisie} onSaisirPrix={majPrixLigne} />
      ))}

      {/* Après confirmation du paiement : proposition d'imprimer le reçu */}
      <Dialog open={!!questionRecu} onOpenChange={o => !o && setQuestionRecu(null)}>
        <DialogContent className="bg-white text-zinc-900 rounded-lg p-4 border shadow-xl" style={{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxWidth:"300px",width:"90%",zIndex:70}}>
          <DialogHeader><DialogTitle>✅ Paiement confirmé !</DialogTitle></DialogHeader>
          <p className="text-sm">Voulez-vous imprimer le reçu de la vente #{questionRecu?.id} ?</p>
          <div className="flex gap-2 mt-3">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => { setRecuA4(questionRecu); setQuestionRecu(null); }}>🖨️ Oui, imprimer</Button>
            <Button variant="outline" className="flex-1" onClick={() => setQuestionRecu(null)}>Non</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reçu au format ticket de caisse, impression automatique dès l'ouverture */}
      {recuA4 && (
        <FeuilleTicket onFermer={() => setRecuA4(null)} autoPrint={true}>
          <div className="text-center">
            <div className="font-bold text-sm">{entreprise ? entreprise.nom : "MotoPièces"}</div>
            <div className="text-[10px]">📞 {entreprise ? entreprise.tel : ""}</div>
            <div className="text-[10px]">--------------------------------</div>
            <div className="font-semibold text-xs">REÇU N° {recuA4.id}</div>
          </div>
          <div className="text-[10px] my-1">
            {recuA4.date || ""}<br />
            Client : {recuA4.client}<br />
            Tel : {recuA4.tel}
          </div>
          <div className="text-[10px]">================================</div>
          {recuA4.items.map((it, i) => {
            const photoItem = it.photo || it.p?.photo || null;
            return (
              <div key={i} className="flex gap-2 items-start py-1 border-b border-dotted border-zinc-300">
                {photoItem ? (
                  <img src={photoItem} alt="" className="w-12 h-12 object-cover rounded border border-zinc-400 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded border border-dashed border-zinc-400 shrink-0 flex items-center justify-center text-[8px] text-zinc-500">📦</div>
                )}
                <div className="text-[10px] flex-1">
                  <div className="font-semibold">{it.p ? it.p.nom : it.nom}</div>
                  <div className="flex justify-between">
                    <span>{it.qte || 1} x {((it.prixLigne ?? (it.p ? it.p.prix : it.prix))).toLocaleString("fr-FR")}</span>
                    <span>{((it.prixLigne ?? (it.p ? it.p.prix : it.prix)) * (it.qte || 1)).toLocaleString("fr-FR")} F</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-[10px]">================================</div>
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL</span>
            <span>{totalCalcule(recuA4).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="text-[10px] mt-1">PAYÉ ✅ — Merci !</div>
          <div className="text-center text-[10px] mt-3">* * *</div>
          <div className="text-center text-[9px]">{entreprise ? entreprise.nom : ""} — {entreprise ? entreprise.tel : ""}</div>
        </FeuilleTicket>
      )}
      </>
      )}
    </div>
  );
}

// ---------- Vue Administrateur ----------

// Vue combinée : une personne qui est vendeur ET secrétaire en même temps
// Contenu du menu développeur : code + création/suppression des comptes administrateurs
function ContenuMenuDev({ codeOk, setCodeOk, codeSaisi, setCodeSaisi, nouvelAdmin, setNouvelAdmin, comptes, setComptes, fermer, CODE_DEV }) {
  const [erreur, setErreur] = useState("");
  const [pinGenere, setPinGenere] = useState(null); // { nom, pin }
  const reinitialiserPinAdmin = (c) => {
    const nouveau = String(Math.floor(1000 + Math.random() * 9000));
    setComptes(prev => prev.map(x => x.id === c.id ? { ...x, pin: nouveau } : x));
    setPinGenere({ nom: c.nom, pin: nouveau });
  };
  // Blocage à distance : le changement part aussitôt vers le serveur (Supabase)
  const bloquerCompteADistance = (c) => {
    const bloque = !c.bloque;
    setComptes(prev => prev.map(x => x.id === c.id ? { ...x, bloque } : x));
    try { synchroniserCompteSupabase({ ...c, bloque }); } catch {}
  };
  if (!codeOk) {
    return (
      <div className="grid gap-1.5">
        <DialogHeader><DialogTitle>🔐 Menu développeur</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Entrez le code pour accéder au menu administrateur.</p>
        <Input type="password" autoFocus value={codeSaisi} onChange={e => setCodeSaisi(e.target.value)} placeholder="Code développeur" />
        <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 text-base"
          onClick={() => setCodeOk(codeSaisi === CODE_DEV)}>Valider</Button>
      </div>
    );
  }
  return (
    <div className="grid gap-1.5">
      <DialogHeader><DialogTitle>👑 Comptes administrateurs</DialogTitle></DialogHeader>
      <Label>Nom complet</Label>
      <Input value={nouvelAdmin.nom} onChange={e => setNouvelAdmin({ ...nouvelAdmin, nom: e.target.value })} placeholder="Ex : Oumar Sekongo" />
      <Label className="pt-2">Téléphone</Label>
      <Input value={nouvelAdmin.tel} onChange={e => setNouvelAdmin({ ...nouvelAdmin, tel: e.target.value })} placeholder="+225 07 00 00 00 00" />
      <Label className="pt-2">Code PIN (4 chiffres)</Label>
      <Input type="password" inputMode="numeric" maxLength={4} value={nouvelAdmin.pin || ""}
        onChange={e => setNouvelAdmin({ ...nouvelAdmin, pin: e.target.value.replace(/\D/g, "") })} placeholder="••••" />
      <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 text-base mt-2"
        disabled={!nouvelAdmin.nom.trim() || (nouvelAdmin.pin || "").length < 4}
        onClick={() => {
          const tel = nouvelAdmin.tel.trim();
          if (tel && comptes.some(c => (c.tel || "").trim() === tel)) {
            setErreur("Ce numéro de téléphone a déjà un compte. Un numéro = un seul compte.");
            return;
          }
          setErreur("");
          const comp = { id: Date.now(), nom: nouvelAdmin.nom.trim(), tel, pin: nouvelAdmin.pin, role: "admin" };
          setComptes(prev => [...prev, comp]);
          synchroniserCompteSupabase(comp);
          setNouvelAdmin({ nom: "", tel: "", pin: "" });
          fermer();
        }}>Créer le compte administrateur</Button>
      {erreur && <p className="text-red-600 text-sm mt-1">{erreur}</p>}

      {comptes.filter(c => c.role === "admin").length > 0 && (
        <div className="pt-3 mt-2 border-t">
          <Label>Suppression — réservée au développeur uniquement :</Label>
          {comptes.filter(c => c.role === "admin").map(c => (
            <div key={c.id} className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  👑 {c.nom} — {c.tel} {c.bloque && <Badge className="bg-red-100 text-red-700 border border-red-300 ml-1">🚫 Bloqué</Badge>}
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => reinitialiserPinAdmin(c)}>🔑 Réinitialiser PIN</Button>
                  <Button size="sm" variant="outline"
                    className={c.bloque ? "border-green-300 text-green-700 hover:bg-green-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
                    onClick={() => setComptes(prev => prev.map(x => x.id === c.id ? { ...x, bloque: !x.bloque } : x))}>
                    {c.bloque ? "🔓 Débloquer" : "🔒 Bloquer"}
                  </Button>
                  <BoutonSupprimer label="🗑️ Supprimer"
                    onSupprimer={() => setComptes(prev => prev.filter(x => x.id !== c.id))} />
                </div>
              </div>
            </div>
          ))}
          {pinGenere && (
            <Card className="bg-amber-50 border-amber-300 mt-3">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Nouveau code PIN de {pinGenere.nom} (à communiquer en privé) :</div>
                <div className="text-2xl font-bold tracking-widest">{pinGenere.pin}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TOUS les comptes : le développeur voit tout le monde et peut bloquer n'importe qui à distance */}
      <div className="pt-3 mt-2 border-t">
        <Label>👥 Tous les comptes inscrits ({comptes.filter(c => c.role !== "admin").length}) — blocage à distance :</Label>
        <p className="text-[11px] text-muted-foreground mt-1">Tous les clients et tout le personnel apparaissent ici, même ceux créés par d'autres administrateurs. Le blocage part aussitôt vers le serveur.</p>
        {comptes.filter(c => c.role !== "admin").map(c => (
          <div key={c.id} className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {c.role === "client" ? "🛍️" : c.role === "vendeur" ? "👤" : c.role === "secretaire" ? "👩‍💼" : "👤"} {c.nom} — {c.tel} {c.bloque && <Badge className="bg-red-100 text-red-700 border border-red-300 ml-1">🚫 Bloqué</Badge>}
            </span>
            <Button size="sm" variant="outline"
              className={c.bloque ? "border-green-300 text-green-700 hover:bg-green-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
              onClick={() => bloquerCompteADistance(c)}>
              {c.bloque ? "🔓 Débloquer" : "🔒 Bloquer"}
            </Button>
          </div>
        ))}
        {comptes.filter(c => c.role !== "admin").length === 0 && (
          <p className="text-muted-foreground text-sm mt-2">Aucun compte inscrit pour le moment.</p>
        )}
      </div>
    </div>
  );
}

function VueVendeurSecretaire({ produits, marques, ventes, creerVente, confirmerPaiement, majPrixLigne, modePrix, entreprise, credits, ajouterCredit, ajouterVersement, validerCredit, categories, cases }) {
  const [vue, setVue] = useState("vendre");
  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-3 flex flex-wrap gap-2">
        <Button variant={vue === "vendre" ? "default" : "outline"} className={vue === "vendre" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setVue("vendre")}>📷 Espace vente</Button>
        <Button variant={vue === "secretaire" ? "default" : "outline"} className={vue === "secretaire" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setVue("secretaire")}>💰 Espace secrétariat</Button>
      </div>

      {/* Gros bouton unique qui réunit toutes les options de crédit : un seul endroit pour tout le crédit */}
      {vue !== "credits" && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <Button size="lg" className="w-full py-6 text-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
            onClick={() => setVue("credits")}>
            💳 Espace Crédits ({(credits || []).filter(c => c.statut !== "payé").length} en cours)
          </Button>
        </div>
      )}

      {vue === "credits" && (
        <GestionCredits credits={credits || []} ajouterCredit={ajouterCredit} ajouterVersement={ajouterVersement} validerCredit={validerCredit} />
      )}
      {vue === "vendre"
        ? <VueVendeur produits={produits} ventes={ventes} creerVente={creerVente}
            categories={categories} credits={credits} cases={cases} />
        : vue === "secretaire"
          ? <VueSecretaire ventes={ventes} confirmerPaiement={confirmerPaiement} majPrixLigne={majPrixLigne} modePrix={modePrix} entreprise={entreprise}
              credits={credits} ajouterCredit={ajouterCredit} ajouterVersement={ajouterVersement} validerCredit={validerCredit} />
          : null}
    </div>
  );
}

function VueAdmin({
  produits, setProduits, marques, setMarques, ventes, genererMarque,
  photosCategories, setPhotosCategories, photosMarques, setPhotosMarques,
  modePrix, setModePrix, categories, setCategories, comptes, setComptes,
  entreprise, setEntreprise, boutiquesMasquees = [], basculerVisibiliteBoutique = () => {},
  transfertsStock = [], effectuerTransfertStock = () => {}, validerTransfertStock = () => {},
  credits = [], ajouterCredit, ajouterVersement, validerCredit,
  cases = [], setCases = () => {},
  chefEquipe = ""
}) {
  const [onglet, setOnglet] = useState("stats");
  const [recherche, setRecherche] = useState("");
  const [cat, setCat] = useState("toutes");
  const [marque, setMarque] = useState("toutes");
  const [tri, setTri] = useState("pertinence");
  const [edite, setEdite] = useState(null);
  const [code, setCode] = useState("");
  const [photoEdite, setPhotoEdite] = useState(null);
  const [caseEdite, setCaseEdite] = useState(""); // case de l'article en cours de modification
  const [mots, setMots] = useState("");
  const [prix, setPrix] = useState("");
  const [stock, setStock] = useState("");
  const [nouvelleMarque, setNouvelleMarque] = useState("");
  const [marqueAAjouter, setMarqueAAjouter] = useState(null);
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [nouvelleCase, setNouvelleCase] = useState({ numero: "", nom: "" }); // case de rangement : numéro + nom
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [np, setNp] = useState({ nom: "", cat: "", marque: "", prix: "", stock: "" });
  const [photoNouveau, setPhotoNouveau] = useState(null);
  const [facture, setFacture] = useState(null);
  const [imprimerTableau, setImprimerTableau] = useState(false);
  const [nouveauCompte, setNouveauCompte] = useState({ nom: "", tel: "", role: "vendeur", pin: "" });
  const [erreurCompte, setErreurCompte] = useState("");
  const [cleAffichee, setCleAffichee] = useState(null);

  // État du module de transfert de stock
  const [articleTransfert, setArticleTransfert] = useState("");
  const [boutiqueCible, setBoutiqueCible] = useState("");
  const [qteTransfert, setQteTransfert] = useState("");
  const [msgTransfert, setMsgTransfert] = useState(null);

  const handleEffectuerTransfert = () => {
    if (!articleTransfert || !qteTransfert) return;
    const res = effectuerTransfertStock(articleTransfert, "", boutiqueCible, qteTransfert);
    setMsgTransfert(res);
    if (res.success) {
      setArticleTransfert("");
      setBoutiqueCible("");
      setQteTransfert("");
    }
  };

  const toutesLesBoutiques = useMemo(() => {
    const setB = new Set();
    produits.forEach(p => setB.add(p.boutique || "MotoPièces Principal"));
    return Array.from(setB);
  }, [produits]); // { nom, tel, cle }

  const genererCle = (c) => {
    const cle = String(Math.floor(100000 + Math.random() * 900000));
    setComptes(prev => prev.map(x => x.id === c.id ? { ...x, cle } : x));
    setCleAffichee({ nom: c.nom, tel: c.tel, cle });
  };

  const creerCompte = () => {
    if (!nouveauCompte.nom.trim() || (nouveauCompte.pin || "").length < 4) return;
    const tel = nouveauCompte.tel.trim();
    if (tel && comptes.some(c => (c.tel || "").trim() === tel)) {
      setErreurCompte("Ce numéro de téléphone a déjà un compte. Un numéro = un seul compte.");
      return;
    }
    setErreurCompte("");
    const comp = {
      id: Date.now(),
      nom: nouveauCompte.nom.trim(),
      tel,
      pin: nouveauCompte.pin,
      role: nouveauCompte.role,
      // Chaque compte rejoint l'équipe de l'administrateur qui le crée
      equipe: (chefEquipe || "").trim(),
    };
    setComptes(prev => [...prev, comp]);
    synchroniserCompteSupabase(comp);
    setNouveauCompte({ nom: "", tel: "", role: "vendeur", pin: "" });
  };

  const roleInfo = (r) => r === "client" ? "👤 Client" : r === "vendeur" ? "🧑‍🔧 Vendeur" : r === "secretaire" ? "👩‍💼 Secrétaire" : r === "vendeur-secretaire" ? "🧑‍🔧👩‍💼 Vendeur + Secrétaire" : "👑 Admin";

  // Chaque administrateur ne voit et ne gère QUE les comptes qu'il a créés lui-même (son équipe).
  // Les comptes créés par un autre administrateur ne sont ni visibles ni supprimables ici.
  // Comptes de mon équipe uniquement (les clients globaux n'apparaissent PAS ici)
  const mesComptes = (comptes || []).filter(c => (c.equipe || "").trim() === (chefEquipe || "").trim() && c.role !== "admin");
  // Clients visibles uniquement s'ils ont commandé un article de CET administrateur
  const clientsAcheteurs = (comptes || []).filter(c =>
    c.role === "client" && (c.equipe || "") === "clients" &&
    (ventes || []).some(v =>
      (v.tel || "").trim() === (c.tel || "").trim() &&
      (v.items || []).some(it => (it.equipe || "").trim() === (chefEquipe || "").trim())
    ));

  const maxId = produits.reduce((m, p) => Math.max(m, p.id), 0);

  const enregistrerNouveau = () => {
    if (!np.nom.trim() || !np.cat) return;
    const stock = Number(np.stock) || 0;
    const id = maxId + 1;
    setProduits(prev => [...prev, {
      id,
      nom: np.nom.trim(),
      cat: np.cat,
      marque: np.marque || "Autre",
      prix: Number(np.prix) || 0,
      stock, stockInit: stock,
      code: "ART-" + String(id).padStart(3, "0"),
      note: 4.0, desc: np.nom.trim(),
      photo: photoNouveau,
      caseId: np.caseId, // case de rangement : le vendeur sait où trouver l'article
      equipe: (chefEquipe || "").trim(), // propriétaire : le téléphone de l'administrateur qui a créé l'article
    }]);
    setNp({ nom: "", cat: "", marque: "", prix: "", stock: "" });
    setPhotoNouveau(null);
    setAjoutOuvert(false);
  };

  const ajouterCategorie = () => {
    const label = nouvelleCategorie.trim();
    if (!label) return;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let id = base, n = 2;
    while (categories.some(c => c.id === id)) id = base + "-" + n++;
    setCategories(prev => [...prev, { id, label, emoji: "📦" }]);
    setNouvelleCategorie("");
  };

  const liste = useMemo(() => {
    let l = produits.filter(p =>
      p.nom.toLowerCase().includes(recherche.toLowerCase()) &&
      (cat === "toutes" || p.cat === cat) &&
      (marque === "toutes" || p.marque === marque));
    if (tri === "prix-asc") l = [...l].sort((a, b) => a.prix - b.prix);
    if (tri === "prix-desc") l = [...l].sort((a, b) => b.prix - a.prix);
    if (tri === "note") l = [...l].sort((a, b) => b.note - a.note);
    return l;
  }, [produits, recherche, cat, marque, tri]);

  const totalCA = ventes.filter(v => v.statut === "payée").reduce((s, v) => s + v.total, 0);
  const enStock = produits.reduce((s, p) => s + p.stock, 0);

  const enregistrer = () => {
    setProduits(prev => prev.map(p => p.id === edite.id ? {
      ...p, code: code.trim() || p.code, prix: Number(prix) || p.prix,
      stock: Number(stock) || 0, stockInit: p.stockInit ?? (Number(stock) || 0), photo: photoEdite || p.photo,
      mots: mots.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
      caseId: caseEdite || p.caseId,
    } : p));
    setPhotoEdite(null);
    setMots("");
    setEdite(null);
  };

  const confirmerMarque = (complet) => {
    const m = marqueAAjouter;
    if (m && !marques.includes(m)) setMarques(prev => [...prev, m]);
    // Plus de génération automatique de pièces : le vendeur ajoute lui-même ses marchandises.
    setMarqueAAjouter(null);
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex flex-wrap gap-2">
        <Button variant={onglet === "stats" ? "default" : "outline"} className={onglet === "stats" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("stats")}>📊 Statistiques</Button>
        <Button variant={onglet === "produits" ? "default" : "outline"} className={onglet === "produits" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("produits")}>📦 Produits ({produits.length})</Button>
        <Button variant={onglet === "marques" ? "default" : "outline"} className={onglet === "marques" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("marques")}>🏍️ Marques ({marques.length})</Button>
        <Button variant={onglet === "categories" ? "default" : "outline"} className={onglet === "categories" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("categories")}>🖼️ Catégories</Button>
        <Button variant={onglet === "cases" ? "default" : "outline"} className={onglet === "cases" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("cases")}>🗄️ Cases ({cases.length})</Button>
        <Button variant={onglet === "boutiques" ? "default" : "outline"} className={onglet === "boutiques" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("boutiques")}>🏪 Magasins ({toutesLesBoutiques.length})</Button>
        <Button variant={onglet === "transferts" ? "default" : "outline"} className={onglet === "transferts" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("transferts")}>🔄 Transferts ({transfertsStock.length})</Button>
        <Button variant={onglet === "credits" ? "default" : "outline"} className={onglet === "credits" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("credits")}>💳 Crédits / Dettes ({credits.filter(c => c.statut !== "payé").length})</Button>
        <Button variant={onglet === "utilisateurs" ? "default" : "outline"} className={onglet === "utilisateurs" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("utilisateurs")}>👥 Utilisateurs</Button>
        <div className="flex-1" />
        <Select value={modePrix} onValueChange={setModePrix}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Qui fixe les prix ?" /></SelectTrigger>
          <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
            <SelectItem value="admin">👑 Prix : Admin</SelectItem>
            <SelectItem value="secretaire">👩‍💼 Prix : Secrétaire</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={onglet === "ventes" ? "default" : "outline"} className={onglet === "ventes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("ventes")}>🧾 Ventes ({ventes.length})</Button>
      </div>

      {/* Gros bouton unique qui réunit toutes les options de crédit : visible uniquement dans l'option Crédits */}
      {onglet === "credits" && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <Button size="lg" className="w-full py-6 text-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
            onClick={() => setOnglet("credits")}>
            💳 Espace Crédits ({credits.filter(c => c.statut !== "payé").length} en cours)
          </Button>
        </div>
      )}

      {onglet === "credits" && (
        <GestionCredits credits={credits} ajouterCredit={ajouterCredit} ajouterVersement={ajouterVersement} validerCredit={validerCredit} />
      )}

      {onglet === "stats" && (
        <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-white"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Chiffre d'affaires encaissé</div>
            <div className="text-2xl font-bold text-green-600">{totalCA.toLocaleString("fr-FR")} FCFA</div>
          </CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Ventes totales</div>
            <div className="text-2xl font-bold">{ventes.length}</div>
          </CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Références en catalogue</div>
            <div className="text-2xl font-bold">{produits.length}</div>
          </CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pièces en stock</div>
            <div className="text-2xl font-bold">{enStock}</div>
          </CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Qui fixe les prix ?</div>
            <div className="text-sm font-medium">
              {modePrix === "admin"
                ? "👑 Admin — les prix s'appliquent automatiquement à chaque vente."
                : "👩‍💼 Secrétaire — elle saisit le prix de chaque article au moment de la vente."}
            </div>
          </CardContent></Card>
        </div>

        {/* Bouton d'impression au milieu, entre le mode de prix et la fiche */}
        <div className="flex justify-center my-4">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 text-base shadow-md" onClick={() => setImprimerTableau(true)}>🖨️ Imprimer la fiche des pièces</Button>
        </div>

        {/* Tableau de toutes les pièces : total, vendues, montant, reste */}
        <Card className="bg-white mt-4">
          <CardContent className="p-0">
            <TableauPieces produits={produits} ventes={ventes} />
          </CardContent>
        </Card>

        {/* Aperçu A4 du tableau pour impression */}
        {imprimerTableau && (
          <FeuilleA4 onFermer={() => setImprimerTableau(false)}>
            <div className="border-b-2 pb-2 mb-4">
              <div className="text-xl font-bold">🏍️ {entreprise.nom} — Inventaire : {entreprise.materiel}</div>
              <div className="text-xs text-muted-foreground">📞 Contact : {entreprise.tel} — Imprimé le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <TableauPieces produits={produits} ventes={ventes} />
          </FeuilleA4>
        )}
        </div>
      )}

      {onglet === "produits" && (
        <div>
          <div className="max-w-6xl mx-auto px-4 pt-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{produits.length} pièces au catalogue</span>
            <Button onClick={() => setAjoutOuvert(true)}>＋ Ajouter une pièce</Button>
          </div>
          <Filtres recherche={recherche} setRecherche={setRecherche} cat={cat} setCat={setCat}
            marque={marque} setMarque={setMarque} marques={marques} tri={tri} setTri={setTri} photosCategories={photosCategories} photosMarques={photosMarques} categories={categories} />
          <main className="max-w-6xl mx-auto px-4 pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {liste.map(p => (
                <Produit key={p.id} p={p} categories={categories} admin onEditer={(pp) => { setEdite(pp); setCode(pp.code || ""); setPhotoEdite(null); setCaseEdite(pp.caseId || ""); setMots((pp.mots || []).join(", ")); setPrix(String(pp.prix)); setStock(String(pp.stock)); }} />
              ))}
            </div>
          </main>
          <Dialog open={!!edite} onOpenChange={o => !o && setEdite(null)}>
            <DialogContent className="bg-white text-zinc-900 rounded-lg p-3 border shadow-xl" style={{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxWidth:"280px",width:"90%",maxHeight:"85vh",overflowY:"auto",zIndex:60}}>
              <DialogHeader><DialogTitle>Modifier : {edite?.nom}</DialogTitle></DialogHeader>
              <div className="grid gap-1.5">
                <Label>Photo de l'article</Label>
                <div className="flex items-center gap-2">
                  {(photoEdite || edite?.photo) ? (
                    <img src={photoEdite || edite.photo} alt="" className="w-12 h-12 rounded-md object-contain border bg-zinc-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-md border bg-zinc-100 flex items-center justify-center text-xl">🖼️</div>
                  )}
                  <input type="file" accept="image/*" className="hidden" id="photo-article-edit" onChange={e => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setPhotoEdite(r.result);
                    r.readAsDataURL(f);
                  }} />
                  <Button size="sm" variant="outline" onClick={() => document.getElementById("photo-article-edit").click()}>
                    📷 {photoEdite || edite?.photo ? "Changer la photo" : "Ajouter une photo"}
                  </Button>
                </div>
                <Label className="pt-2">Code article</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex : ART-013" />
                <Label className="pt-2">Prix (FCFA)</Label>
                <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} />
                <Label className="pt-2">Mots-clés écrits sur la pièce (ex : Papa)</Label>
                <Input value={mots} onChange={e => setMots(e.target.value)} placeholder="Papa, NGK, 428H…" />
                <p className="text-[11px] text-muted-foreground">
                  Séparez par des virgules. Si le vendeur lit ce mot sur la marchandise, l'article se reconnaît automatiquement.
                </p>
                <Label className="pt-2">Stock</Label>
                <Input type="number" value={stock} onChange={e => setStock(e.target.value)} />
                <Label className="pt-2">🗄️ Case de rangement</Label>
                {cases.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune case créée. Créez vos cases dans l'onglet « 🗄️ Cases ».</p>
                ) : (
                  <Select value={caseEdite || undefined} onValueChange={v => setCaseEdite(v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir la case…" /></SelectTrigger>
                    <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
                      {[...cases].sort((a, b) => Number(a.numero) - Number(b.numero)).map(c => (
                        <SelectItem key={c.id} value={c.id}>🗄️ Case n°{c.numero} — {c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEdite(null)}>Annuler</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 text-base" onClick={enregistrer}>Enregistrer</Button>
              </DialogFooter>
              <Separator className="my-2" />
              <BoutonSupprimer label="🗑️ Supprimer cette pièce"
                onSupprimer={() => { setProduits(prev => prev.filter(x => x.id !== edite.id)); setEdite(null); }} />
            </DialogContent>
          </Dialog>

          <Dialog open={ajoutOuvert} onOpenChange={setAjoutOuvert}>
            <DialogContent className="bg-white text-zinc-900 rounded-lg p-3 border shadow-xl" style={{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxWidth:"280px",width:"90%",maxHeight:"85vh",overflowY:"auto",zIndex:60}}>
              <DialogHeader><DialogTitle>➕ Ajouter une pièce</DialogTitle></DialogHeader>
              <div className="grid gap-1.5">
                <Label>Photo de reconnaissance</Label>
                <div className="flex items-center gap-2">
                  {photoNouveau
                    ? <img src={photoNouveau} alt="" className="w-12 h-12 rounded-md object-contain border bg-zinc-100" />
                    : <div className="w-12 h-12 rounded-md border bg-zinc-100 flex items-center justify-center text-xl">🖼️</div>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" id="photo-piece-nouveau" onChange={e => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setPhotoNouveau(r.result);
                    r.readAsDataURL(f);
                  }} />
                  <Button size="sm" variant="outline" onClick={() => document.getElementById("photo-piece-nouveau").click()}>
                    📷 {photoNouveau ? "Changer" : "Photographier"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cette photo sert de référence à la reconnaissance automatique : photographiez la pièce de face, avec son numéro ou son écriture visible si elle en porte.
                </p>
                <Label className="pt-2">Nom de la pièce</Label>
                <Input value={np.nom} onChange={e => setNp({ ...np, nom: e.target.value })} placeholder="Ex : Bougie NGK" />
                <Label className="pt-2">Catégorie</Label>
                <Select value={np.cat || undefined} onValueChange={v => setNp({ ...np, cat: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="pt-2">Marque</Label>
                <Select value={np.marque || "Autre"} onValueChange={v => setNp({ ...np, marque: v })}>
                  <SelectTrigger><SelectValue placeholder="Marque…" /></SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
                    <SelectItem value="Autre">Autre</SelectItem>
                    {marques.map(m => <SelectItem key={m} value={m}>🏍️ {m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="pt-2">Prix (FCFA)</Label>
                <Input type="number" value={np.prix} onChange={e => setNp({ ...np, prix: e.target.value })} placeholder="0" />
                <Label className="pt-2">Stock</Label>
                <Input type="number" value={np.stock} onChange={e => setNp({ ...np, stock: e.target.value })} placeholder="10" />
                <Label className="pt-2">🗄️ Case où se trouve l'article</Label>
                {cases.length === 0 ? (
                  <p className="text-xs text-red-600">⚠️ Aucune case n'existe encore. Créez d'abord vos cases dans l'onglet « 🗄️ Cases ».</p>
                ) : (
                  <Select value={np.caseId || undefined} onValueChange={v => setNp({ ...np, caseId: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir la case…" /></SelectTrigger>
                    <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
                      {[...cases].sort((a, b) => Number(a.numero) - Number(b.numero)).map(c => (
                        <SelectItem key={c.id} value={c.id}>🗄️ Case n°{c.numero} — {c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAjoutOuvert(false)}>Annuler</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 text-base" disabled={!np.nom.trim() || !np.cat || !np.caseId} onClick={enregistrerNouveau}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {onglet === "marques" && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Input className="w-[220px]" placeholder="Nouvelle marque (ex : Sanya)" value={nouvelleMarque}
              onChange={e => setNouvelleMarque(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (nouvelleMarque.trim()) { setMarqueAAjouter(nouvelleMarque.trim()); setNouvelleMarque(""); } } }} />
            <Button disabled={!nouvelleMarque.trim()} onClick={() => { setMarqueAAjouter(nouvelleMarque.trim()); setNouvelleMarque(""); }}>+ Ajouter</Button>
          </div>
          {marques.length === 0 ? <p className="text-muted-foreground">Aucune marque. Ajoutez les marques de motos que vous vendez.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {marques.map(m => (
                <Card key={m} className="bg-white">
                  <CardContent className="p-3 flex items-center gap-3">
                    {photosMarques[m]
                      ? <img src={photosMarques[m]} alt={m} className="w-14 h-14 rounded-md object-contain border bg-zinc-100" />
                      : <div className="w-14 h-14 rounded-md border bg-zinc-100 flex items-center justify-center text-2xl">🏍️</div>}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{m}</div>
                      <div className="flex gap-1 mt-1">
                        <input type="file" accept="image/*" capture="environment" className="hidden" id={`photo-marque-${m}`} onChange={e => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          const r = new FileReader();
                          r.onload = () => setPhotosMarques(prev => ({ ...prev, [m]: r.result }));
                          r.readAsDataURL(f);
                        }} />
                        <Button size="sm" variant="outline" onClick={() => document.getElementById(`photo-marque-${m}`).click()}>
                          📷 {photosMarques[m] ? "Changer" : "Photo"}
                        </Button>
                        <BoutonSupprimer label="🗑️ Supprimer"
                          onSupprimer={() => setMarques(prev => prev.filter(x => x !== m))} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Dialog open={!!marqueAAjouter} onOpenChange={o => !o && setMarqueAAjouter(null)}>
            <DialogContent className="bg-white text-zinc-900 rounded-lg p-3 border shadow-xl" style={{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxWidth:"280px",width:"90%",maxHeight:"85vh",overflowY:"auto",zIndex:60}}>
              <DialogHeader><DialogTitle>Ajouter la marque « {marqueAAjouter} »</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                Voulez-vous aussi ajouter toutes les pièces standards de cette moto au catalogue ({PIECES_STANDARDS.length} pièces) ?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => confirmerMarque(false)}>Non, juste la marque</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => confirmerMarque(true)}>Oui, tout ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Onglet Cases : l'admin numérote et nomme les cases de rangement AVANT d'enregistrer les articles */}
      {onglet === "cases" && (
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          <Card className="bg-white"><CardContent className="p-4 space-y-2">
            <div className="font-semibold">🗄️ Créer une case de rangement</div>
            <p className="text-xs text-muted-foreground">Numérotez vos cases et donnez-leur un nom (ex : Case 1 — Bougies). Ensuite, quand vous enregistrez un article, vous choisissez la case où il se trouve. Le vendeur verra « Case n°1 » et saura exactement où prendre l'article.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input type="number" placeholder="Numéro de case (ex : 1)" value={nouvelleCase.numero}
                onChange={e => setNouvelleCase({ ...nouvelleCase, numero: e.target.value.replace(/\D/g, "") })} />
              <Input placeholder="Nom de la case (ex : Bougies)" value={nouvelleCase.nom}
                onChange={e => setNouvelleCase({ ...nouvelleCase, nom: e.target.value })} />
              <Button className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!(Number(nouvelleCase.numero) > 0) || !nouvelleCase.nom.trim()}
                onClick={() => {
                  const numero = Number(nouvelleCase.numero);
                  if (cases.some(c => Number(c.numero) === numero)) return;
                  setCases(prev => [...prev, { id: "case-" + numero, numero, nom: nouvelleCase.nom.trim() }]);
                  setNouvelleCase({ numero: "", nom: "" });
                }}>➕ Créer la case</Button>
            </div>
            {Number(nouvelleCase.numero) > 0 && cases.some(c => Number(c.numero) === Number(nouvelleCase.numero)) && (
              <p className="text-xs text-red-600">⚠️ Ce numéro de case existe déjà.</p>
            )}
          </CardContent></Card>

          <div className="font-semibold text-sm">🗄️ Vos cases ({cases.length})</div>
          {cases.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune case pour le moment. Créez d'abord vos cases, puis enregistrez vos articles en choisissant leur case.</p>
          ) : (
            <div className="space-y-2">
              {[...cases].sort((a, b) => Number(a.numero) - Number(b.numero)).map(c => (
                <Card key={c.id} className="bg-white"><CardContent className="p-2 flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 border-2 border-blue-300 rounded-md flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] text-blue-700 font-semibold leading-none">CASE</span>
                    <span className="text-lg font-extrabold text-blue-700 leading-none">n°{c.numero}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.nom}</div>
                    <div className="text-xs text-muted-foreground">{produits.filter(p => p.caseId === c.id).length} article{produits.filter(p => p.caseId === c.id).length > 1 ? "s" : ""} rangé{produits.filter(p => p.caseId === c.id).length > 1 ? "s" : ""} dans cette case</div>
                  </div>
                  <BoutonSupprimer label="🗑️" onSupprimer={() => setCases(prev => prev.filter(x => x.id !== c.id))} />
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {onglet === "categories" && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Input className="w-[240px]" placeholder="Nouvelle catégorie (ex : Huiles)" value={nouvelleCategorie}
              onChange={e => setNouvelleCategorie(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ajouterCategorie(); } }} />
            <Button disabled={!nouvelleCategorie.trim()} onClick={ajouterCategorie}>+ Ajouter la catégorie</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(c => (
              <Card key={c.id} className="bg-white">
                <CardContent className="p-3 flex items-center gap-3">
                  {photosCategories[c.id]
                    ? <img src={photosCategories[c.id]} alt={c.label} className="w-14 h-14 rounded-md object-contain border bg-zinc-100" />
                    : <div className="w-14 h-14 rounded-md border bg-zinc-100 flex items-center justify-center text-2xl">{c.emoji || "📦"}</div>}
                  <div className="flex-1">
                    <Input className="h-8 text-sm font-medium" value={c.label}
                      onChange={e => setCategories(prev => prev.map(x => x.id === c.id ? { ...x, label: e.target.value } : x))} />
                    <div className="flex gap-1 mt-1">
                      <input type="file" accept="image/*" capture="environment" className="hidden" id={`photo-cat-${c.id}`} onChange={e => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = () => setPhotosCategories(prev => ({ ...prev, [c.id]: r.result }));
                        r.readAsDataURL(f);
                      }} />
                      <Button size="sm" variant="outline" onClick={() => document.getElementById(`photo-cat-${c.id}`).click()}>
                        📷 Photo
                      </Button>
                      <BoutonSupprimer label="🗑️ Supprimer"
                        onSupprimer={() => setCategories(prev => prev.filter(x => x.id !== c.id))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Vous pouvez renommer directement dans le champ, ajouter une photo d'exemple, ou supprimer les catégories pour mettre les vôtres.
          </p>
        </div>
      )}

      {onglet === "utilisateurs" && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Mon magasin : nom, contact et type de matériel vendu */}
          <Card className="bg-white mb-4">
            <CardContent className="p-4">
              <div className="font-semibold mb-3">🏪 Mon magasin</div>
              <div className="grid gap-2">
                <Label>Nom du magasin / entreprise</Label>
                <Input value={entreprise.nom} onChange={e => setEntreprise({ ...entreprise, nom: e.target.value })} placeholder="Ex : MotoPièces" />
                <Label className="pt-2">Numéro de contact</Label>
                <Input value={entreprise.tel} onChange={e => setEntreprise({ ...entreprise, tel: e.target.value })} placeholder="+225 07 00 00 00 00" />
                <Label className="pt-2">Type de matériel vendu</Label>
                <Input value={entreprise.materiel} onChange={e => setEntreprise({ ...entreprise, materiel: e.target.value })} placeholder="Ex : Pièces de moto, Pièces auto, Téléphones…" />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["🏍️ Pièces de moto", "🚗 Pièces auto", "📱 Téléphones", "⚡ Matériel électronique", "🛠️ Outillage", "👕 Vêtements"].map(m => (
                    <button key={m}
                      className={`text-xs border rounded-full px-2.5 py-1 transition-colors ${entreprise.materiel === m ? "bg-blue-600 text-white border-blue-600" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
                      onClick={() => setEntreprise({ ...entreprise, materiel: m })}>{m}</button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Le nom, le contact et le type de matériel s'affichent partout : en-tête, écran de connexion, factures et documents imprimés.
                Ensuite, créez vos propres catégories de marchandises dans l'onglet « 🖼️ Catégories » et ajoutez vos articles dans « 📦 Produits ».
              </p>
            </CardContent>
          </Card>

          {/* Création de compte */}
          <Card className="bg-white mb-4">
            <CardContent className="p-4">
              <div className="font-semibold mb-3">➕ Créer un compte</div>
              <div className="grid gap-2">
                <Label>Nom complet</Label>
                <Input value={nouveauCompte.nom} onChange={e => setNouveauCompte({ ...nouveauCompte, nom: e.target.value })} placeholder="Ex : Aïcha Koné" />
                <Label className="pt-2">Téléphone</Label>
                <Input value={nouveauCompte.tel} onChange={e => setNouveauCompte({ ...nouveauCompte, tel: e.target.value })} placeholder="+225 07 00 00 00 00" />
                <Label className="pt-2">Fonction (rôle)</Label>
                <Select value={nouveauCompte.role} onValueChange={v => setNouveauCompte({ ...nouveauCompte, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900 border border-zinc-200 shadow-lg z-[200]">
                    <SelectItem value="client">👤 Client</SelectItem>
                    <SelectItem value="vendeur">🧑‍🔧 Vendeur</SelectItem>
                    <SelectItem value="secretaire">👩‍💼 Secrétaire</SelectItem>
                    <SelectItem value="vendeur-secretaire">🧑‍🔧👩‍💼 Vendeur + Secrétaire</SelectItem>
                  </SelectContent>
                </Select>
                <Label className="pt-2">Code PIN (4 chiffres)</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={nouveauCompte.pin || ""}
                  onChange={e => setNouveauCompte({ ...nouveauCompte, pin: e.target.value.replace(/\D/g, "") })} placeholder="••••" />
              </div>
              {erreurCompte && <p className="text-red-600 text-sm mt-2">{erreurCompte}</p>}
              <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base"
                disabled={!nouveauCompte.nom.trim() || (nouveauCompte.pin || "").length < 4} onClick={creerCompte}>Créer le compte</Button>
            </CardContent>
          </Card>

          {/* Clé de réinitialisation générée (à communiquer à la personne) */}
          {cleAffichee && (
            <Card className="bg-amber-50 border-amber-300 mb-4">
              <CardContent className="p-4">
                <div className="font-semibold text-sm">🔑 Clé de réinitialisation</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour <span className="font-medium">{cleAffichee.nom}</span> ({cleAffichee.tel}) :
                  communiquez-lui cette clé en privé. Avec cette clé, la personne pourra choisir elle-même un nouveau code PIN sur l'écran de connexion (« Code PIN oublié ? »).
                </p>
                <div className="text-2xl font-bold tracking-widest text-center mt-2">{cleAffichee.cle}</div>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setCleAffichee(null)}>J'ai transmis la clé</Button>
              </CardContent>
            </Card>
          )}

          {/* Liste des comptes : uniquement ceux créés par cet administrateur */}
          <div className="text-sm text-muted-foreground mb-2">{mesComptes.length} compte{mesComptes.length > 1 ? "s" : ""} créé{mesComptes.length > 1 ? "s" : ""} par toi</div>
          {mesComptes.map(c => (
            <Card key={c.id} className="bg-white mb-2">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">
                    {roleInfo(c.role)} — {c.nom} {c.bloque && <Badge className="bg-red-100 text-red-700 border border-red-300 ml-1">🚫 Bloqué</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.tel || "—"}</div>
                </div>
                {c.role === "admin" ? (
                  <span className="text-xs text-muted-foreground">🔒 Géré par le développeur</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => genererCle(c)}>🔑 Clé</Button>
                    <Button size="sm" variant="outline"
                      className={c.bloque ? "border-green-300 text-green-700 hover:bg-green-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
                      onClick={() => setComptes(prev => prev.map(x => x.id === c.id ? { ...x, bloque: !x.bloque } : x))}>
                      {c.bloque ? "🔓 Débloquer" : "🔒 Bloquer"}
                    </Button>
                    <BoutonSupprimer label="🗑️ Supprimer"
                      onSupprimer={() => setComptes(prev => prev.filter(x => x.id !== c.id))} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {mesComptes.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucun compte créé par toi pour le moment. Utilisez le formulaire ci-dessus pour créer un compte client, vendeur ou secrétaire. Les comptes créés par d'autres administrateurs ne s'affichent pas ici.</p>
          )}

          {/* Clients : visibles uniquement quand ils commandent un de tes articles */}
          <div className="mt-5">
            <div className="font-semibold text-sm mb-1">🛍️ Clients ayant commandé tes articles ({clientsAcheteurs.length})</div>
            <div className="text-xs text-muted-foreground mb-2">Un compte client apparaît ici seulement après avoir commandé un article de ta boutique.</div>
            {clientsAcheteurs.map(c => (
              <Card key={"cli-" + c.id} className="bg-white mb-2">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">
                      🛍️ Client — {c.nom} {c.bloque && <Badge className="bg-red-100 text-red-700 border border-red-300 ml-1">🚫 Bloqué</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.tel || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline"
                      className={c.bloque ? "border-green-300 text-green-700 hover:bg-green-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
                      onClick={() => setComptes(prev => prev.map(x => x.id === c.id ? { ...x, bloque: !x.bloque } : x))}>
                      {c.bloque ? "🔓 Débloquer" : "🔒 Bloquer"}
                    </Button>
                    <BoutonSupprimer label="🗑️ Supprimer"
                      onSupprimer={() => setComptes(prev => prev.filter(x => x.id !== c.id))} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {clientsAcheteurs.length === 0 && (
              <p className="text-muted-foreground text-sm">Aucun client n'a encore commandé tes articles. Dès qu'un client achète un de tes articles, son compte apparaît ici.</p>
            )}
          </div>
        </div>
      )}

      {onglet === "boutiques" && (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <Card className="bg-white border shadow-sm">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span>🏪 Contrôle de Visibilité des Magasins / Boutiques</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">🔒 Rôle Administrateur</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Masquez ou réaffichez en un clic l'intégralité des marchandises associées à une boutique spécifique sur l'interface client. Lorsqu'une boutique est masquée, ses articles n'apparaissent plus dans le catalogue général.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {toutesLesBoutiques.map(nomBoutique => {
                  const estMasquee = boutiquesMasquees.includes(nomBoutique);
                  const nbArticles = produits.filter(p => (p.boutique || "MotoPièces Principal") === nomBoutique).length;

                  return (
                    <div key={nomBoutique} className={`p-4 border rounded-lg flex items-center justify-between gap-3 transition ${estMasquee ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200"}`}>
                      <div>
                        <p className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                          🏪 {nomBoutique}
                          {estMasquee ? (
                            <Badge className="bg-red-600 text-white text-[10px]">🙈 Masquée Client</Badge>
                          ) : (
                            <Badge className="bg-green-600 text-white text-[10px]">👁️ Visible Client</Badge>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {nbArticles} marchandise{nbArticles > 1 ? "s" : ""} associée{nbArticles > 1 ? "s" : ""}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={estMasquee ? "default" : "outline"}
                        className={estMasquee ? "bg-green-600 hover:bg-green-700 text-white text-xs font-semibold" : "border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold"}
                        onClick={() => basculerVisibiliteBoutique(nomBoutique)}
                      >
                        {estMasquee ? "👁️ Réafficher" : "🙈 Masquer"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {onglet === "transferts" && (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <Card className="bg-white border shadow-sm">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span>🔄 Transfert Sécurisé de Stock entre Administrateurs & Magasins</span>
                <Badge className="bg-blue-600 text-white">👑 Espace Administrateur</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Initiez le transfert de marchandises d'un magasin vers un autre. Les mouvements sont tracés en temps réel et nécessitent une validation pour mettre à jour automatiquement les stocks disponibles.
              </p>

              {msgTransfert && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${msgTransfert.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {msgTransfert.message}
                </div>
              )}

              {/* Formulaire de transfert */}
              <div className="p-4 border rounded-xl bg-zinc-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <Label className="text-xs font-semibold">Article / Produit</Label>
                  <Select value={articleTransfert} onValueChange={setArticleTransfert}>
                    <SelectTrigger className="bg-white text-xs mt-1"><SelectValue placeholder="Sélectionner l'article" /></SelectTrigger>
                    <SelectContent className="bg-white z-[200]">
                      {produits.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          📦 {p.nom} (Stock : {p.stock}) — 🏪 {p.boutique || "MotoPièces Principal"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Magasin / Entrepôt Cible</Label>
                  <Input
                    value={boutiqueCible}
                    onChange={e => setBoutiqueCible(e.target.value)}
                    placeholder="Ex : Garage Honda Abidjan"
                    className="bg-white text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Quantité à transférer</Label>
                  <Input
                    type="number"
                    min="1"
                    value={qteTransfert}
                    onChange={e => setQteTransfert(e.target.value)}
                    placeholder="Ex : 5"
                    className="bg-white text-xs mt-1"
                  />
                </div>

                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 font-bold shadow"
                  onClick={handleEffectuerTransfert}
                >
                  🚀 Initier le Transfert
                </Button>
              </div>

              {/* Historique des transferts */}
              <div className="pt-2">
                <h3 className="font-bold text-sm text-zinc-900 mb-2">📋 Suivi des Transferts de Stock :</h3>
                {transfertsStock.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center border rounded-lg bg-zinc-50">
                    Aucun transfert de stock n'a été initié pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transfertsStock.map(t => (
                      <div key={t.id} className="p-3 border rounded-lg bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                        <div className="space-y-1">
                          <div className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                            📦 {t.produitNom} (Qté : {t.quantite})
                            {t.statut === "valide" ? (
                              <Badge className="bg-green-600 text-white text-[10px]">Validé ✅</Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white text-[10px]">En attente ⏳</Badge>
                            )}
                          </div>
                          <p className="text-zinc-500">
                            De <span className="font-semibold text-zinc-700">🏪 {t.boutiqueSource}</span> vers <span className="font-semibold text-blue-700">🏪 {t.boutiqueCible}</span>
                          </p>
                          <p className="text-[10px] text-zinc-400">Initiés par {t.emetteur} le {t.date}</p>
                        </div>

                        {t.statut !== "valide" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow shrink-0"
                            onClick={() => validerTransfertStock(t.id)}
                          >
                            ✅ Valider & Transférer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {onglet === "ventes" && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          {ventes.length === 0 ? <p className="text-muted-foreground">Aucune vente.</p> : ventes.map(v => (
            <div key={v.id}>
              <LigneVente v={v} />
              <div className="px-3 pb-2 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setFacture(v)}>🧾 Facture</Button>
              </div>
            </div>
          ))}

          {/* Facture sur feuille A4 imprimable */}
          {facture && (() => {
            const prixLigne = (it) => it.prixLigne ?? (it.p ? it.p.prix : it.prix);
            const qteLigne = (it) => it.qte || 1;
            const totalFacture = facture.items.reduce((s, it) => s + prixLigne(it) * qteLigne(it), 0);
            return (
              <FeuilleA4 onFermer={() => setFacture(null)}>
                <div className="border-b-2 pb-2 mb-4">
                  <div className="text-xl font-bold">🏍️ {entreprise.nom}</div>
                  <div className="text-xs text-muted-foreground">📞 Contact : {entreprise.tel}</div>
                  <div className="text-xs text-muted-foreground">Facture — Vente #{facture.id} — {facture.date || ""}</div>
                </div>
                <div className="text-sm mb-4">
                  <div>Client : <span className="font-semibold">{facture.client}</span> ({facture.tel})</div>
                  <div className="text-xs text-muted-foreground">Vendeur : {facture.vendeur} — Statut : {facture.statut === "payée" ? "Payée ✅" : "En attente"}</div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b-2">
                      <th className="p-2">Article</th>
                      <th className="p-2 text-center">Qté</th>
                      <th className="p-2 text-right">Prix unitaire</th>
                      <th className="p-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facture.items.map((it, i) => {
                      const photoArt = it.photo || (it.p && it.p.photo);
                      return (
                        <tr key={i} className="border-b">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {photoArt
                                ? <img src={photoArt} alt="" className="w-9 h-9 rounded object-contain border bg-zinc-100" />
                                : <span className="w-9 h-9 rounded border bg-zinc-100 inline-flex items-center justify-center">📦</span>}
                              <span>{it.p ? it.p.nom : it.nom}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">{qteLigne(it)}</td>
                          <td className="p-2 text-right">{prixLigne(it).toLocaleString("fr-FR")}</td>
                          <td className="p-2 text-right font-semibold">{(prixLigne(it) * qteLigne(it)).toLocaleString("fr-FR")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between font-bold text-base mt-3 pt-2 border-t-2">
                  <span>TOTAL</span>
                  <span>{totalFacture.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <p className="text-xs text-muted-foreground mt-8">Merci de votre confiance ! — {entreprise.nom} — 📞 {entreprise.tel}</p>
              </FeuilleA4>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ---------- Composant Chat Flottant & Messagerie Routée selon Rôle ----------
// ---------- Talkie-walkie vocal (administrateur & vendeurs uniquement) ----------
const TALKIE_ROLES = ["admin", "vendeur", "vendeur-secretaire", "secretaire"];
// ---------- Talkie-walkie EN DIRECT (administrateur & vendeurs uniquement) ----------
// On maintient le bouton : la voix sort en même temps chez les autres.
// On relâche : le micro se coupe automatiquement, chez tout le monde.
// Chaque admin parle uniquement avec son équipe ; les admins ont en plus un espace entre eux.

// Fabrique 1 seconde de silence (petit fichier WAV fabriqué dans le téléphone).
// Ce silence tourne en boucle volume 0 : le téléphone croit que l'application joue de la musique
// et laisse donc le son du talkie marcher MÊME en arrière-plan ou écran éteint.
function faireSilence() {
  try {
    const taux = 8000, nb = taux; // 1 seconde
    const buffer = new ArrayBuffer(44 + nb);
    const vue = new DataView(buffer);
    const ecrire = (pos, txt) => { for (let i = 0; i < txt.length; i++) vue.setUint8(pos + i, txt.charCodeAt(i)); };
    ecrire(0, "RIFF"); vue.setUint32(4, 36 + nb, true); ecrire(8, "WAVE");
    ecrire(12, "fmt "); vue.setUint32(16, 16, true); vue.setUint16(20, 1, true); vue.setUint16(22, 1, true);
    vue.setUint32(24, taux, true); vue.setUint32(28, taux, true); vue.setUint16(32, 1, true); vue.setUint16(34, 8, true);
    ecrire(36, "data"); vue.setUint32(40, nb, true);
    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  } catch { return ""; }
}

function TalkieWalkie({ role, userActif, comptes }) {
  const [ouvert, setOuvert] = useState(false);
  const [destinataire, setDestinataire] = useState("equipe"); // "equipe" | "admins" | téléphone d'une personne
  const [enEmission, setEnEmission] = useState(false);
  const [enReception, setEnReception] = useState(false);
  const [nomQuiParle, setNomQuiParle] = useState("");
  const [info, setInfo] = useState("");
  const [connectes, setConnectes] = useState([]); // personnes ayant le talkie ouvert en ce moment
  const [relance, setRelance] = useState(0); // +1 quand il faut se rebrancher tout seul
  const gardeRef = useRef(null); // lecteur de silence qui garde le son actif en arrière-plan
  const canalRef = useRef(null);
  const pcsRef = useRef({});
  const fluxRef = useRef(null);
  const audioRef = useRef(null);
  const enEmissionRef = useRef(false);
  const [niveau, setNiveau] = useState(0); // 0 à 1 : force de la voix (pour les barres animées)
  const analyseurRef = useRef(null);
  const boucleAnimRef = useRef(null);

  const monTel = (userActif?.tel || "").trim();
  const monNom = userActif?.nom || "Moi";
  const estAdmin = role === "admin";

  // Mon équipe : uniquement les comptes créés par mon administrateur
  const cleEquipeDe = (c) => (c.role === "admin" ? (c.tel || "").trim() : (c.equipe || "defaut"));
  const maCle = estAdmin ? monTel : ((userActif?.equipe || "").trim() || "defaut");
  const membresEquipe = (comptes || []).filter(c =>
    TALKIE_ROLES.includes(c.role) && (c.tel || "").trim() && (c.tel || "").trim() !== monTel && cleEquipeDe(c) === maCle);
  const lesAdmins = (comptes || []).filter(c => c.role === "admin" && (c.tel || "").trim() !== monTel);
  const contactsAutorises = estAdmin ? [...membresEquipe, ...lesAdmins] : membresEquipe;
  // Les clients connectés sur le talkie : l'équipe peut aussi leur répondre directement
  const clientsTels = (comptes || []).filter(c => c.role === "client" && (c.tel || "").trim() && (c.tel || "").trim() !== monTel).map(c => (c.tel || "").trim());
  const titreDuCanal = (c) => c === "equipe" ? "👥 Mon équipe" : c === "admins" ? "👑 Espace Admins" : "👤 " + (((comptes || []).find(x => (x.tel || "").trim() === c) || {}).nom || c);

  const signaler = (payload) => {
    try {
      const canal = canalRef.current;
      if (!canal) return;
      canal.send({ type: "broadcast", event: "signal", payload: { ...payload, de: monTel, nomDe: monNom } });
    } catch {}
  };

  const couperReception = (telEmetteur) => {
    try {
      if (telEmetteur && pcsRef.current[telEmetteur]) {
        try { pcsRef.current[telEmetteur].close(); } catch {}
        delete pcsRef.current[telEmetteur];
      } else {
        Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
        pcsRef.current = {};
      }
    } catch {}
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.srcObject = null; } catch {} }
    setEnReception(false);
    setNomQuiParle("");
  };

  // Quelqu'un maintient son bouton : on l'écoute en direct
  const ecouterOffre = async (p) => {
    if (typeof RTCPeerConnection === "undefined") return;
    try {
      couperReception();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] });
      pc.onicecandidate = (e) => { if (e.candidate) signaler({ type: "cand", vers: p.de, c: e.candidate }); };
      pc.ontrack = (e) => {
        try {
          const audio = audioRef.current;
          if (!audio) return;
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
          setEnReception(true);
          setNomQuiParle(p.nomDe || p.de);
          try { navigator.vibrate && navigator.vibrate(200); } catch {}
          // Pas de notification à autoriser : la voix sort toute seule par le haut-parleur.
        } catch {}
      };
      pc.oniceconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.iceConnectionState)) couperReception(p.de);
      };
      await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      const reponse = await pc.createAnswer();
      await pc.setLocalDescription(reponse);
      signaler({ type: "reponse", vers: p.de, sdp: reponse });
      pcsRef.current[p.de] = pc;
    } catch (e) {
      console.warn("Talkie : impossible d'écouter l'émetteur", e);
    }
  };

  const traiterSignal = (p) => {
    if (!p || p.de === monTel) return;
    if (p.type !== "fin" && p.vers !== "groupe" && p.vers !== monTel) return;
    if (p.type === "offre") { ecouterOffre(p); return; }
    if (p.type === "reponse") {
      const pc = pcsRef.current[p.de];
      if (pc) pc.setRemoteDescription(new RTCSessionDescription(p.sdp)).catch(() => {});
      return;
    }
    if (p.type === "cand") {
      const pc = pcsRef.current[p.de];
      if (pc) pc.addIceCandidate(new RTCIceCandidate(p.c)).catch(() => {});
      return;
    }
    if (p.type === "fin") couperReception(p.de);
  };

  // Ouverture du talkie : on rejoint le canal et on annonce sa présence
  useEffect(() => {
    if (!monTel) return; // le talkie se connecte tout seul dès que l'application est ouverte
    let canal = null;
    try {
      canal = supabase.channel("talkie-walkie", { config: { presence: { key: monTel }, broadcast: { self: false } } });
      canalRef.current = canal;
      canal.on("presence", { event: "sync" }, () => {
        try {
          const liste = Object.values(canal.presenceState()).flat();
          const telsAutorises = contactsAutorises.map(c => (c.tel || "").trim()).concat(estAdmin ? [] : clientsTels);
          setConnectes(liste.filter(c => (c.tel || "").trim() !== monTel && telsAutorises.includes((c.tel || "").trim())));
        } catch {}
      });
      canal.on("broadcast", { event: "signal" }, ({ payload }) => traiterSignal(payload));
      canal.subscribe((statut) => {
        if (statut === "SUBSCRIBED") { try { canal.track({ nom: monNom, tel: monTel }); } catch {} }
      });
    } catch (e) {
      setInfo("⚠️ Connexion du talkie impossible : " + (e?.message || e));
    }
    return () => {
      if (enEmissionRef.current) signaler({ type: "fin", vers: "groupe" });
      try { canal?.unsubscribe?.(); } catch {}
      canalRef.current = null;
      couperReception();
    };
  }, [monTel, relance]);

  // Chien de garde : si la connexion du talkie est tombée (réseau, veille, écran éteint), on se rebranche tout seul.
  // On vérifie aussi à chaque fois qu'on revient sur l'application.
  useEffect(() => {
    if (!monTel) return;
    const verifier = () => { if (!canalRef.current) setRelance((x) => x + 1); };
    const chien = setInterval(verifier, 8000);
    document.addEventListener("visibilitychange", verifier);
    return () => { clearInterval(chien); document.removeEventListener("visibilitychange", verifier); };
    // eslint-disable-next-line
  }, [monTel]);

  // GARDE DU SON EN ARRIÈRE-PLAN : au premier toucher de l'écran (n'importe où),
  // on lance 1 seconde de silence en boucle, volume 0. Le téléphone croit qu'on écoute de la musique,
  // donc il laisse le talkie marcher même si l'application passe derrière, même écran éteint.
  // Aucune autorisation à donner : le son de la voix sort tout seul par le haut-parleur.
  useEffect(() => {
    const demarrerGarde = () => {
      try {
        if (gardeRef.current) return;
        const a = document.createElement("audio");
        a.src = faireSilence(); a.loop = true; a.volume = 0;
        a.setAttribute("playsinline", ""); a.setAttribute("webkit-playsinline", "");
        const promesse = a.play();
        if (promesse && promesse.then) promesse.then(() => { gardeRef.current = a; }).catch(() => { try { a.pause(); } catch {} });
        else gardeRef.current = a;
      } catch {}
    };
    document.addEventListener("pointerdown", demarrerGarde, { once: true });
    document.addEventListener("touchstart", demarrerGarde, { once: true });
    return () => { document.removeEventListener("pointerdown", demarrerGarde); document.removeEventListener("touchstart", demarrerGarde); };
    // eslint-disable-next-line
  }, []);

  // Déblocage du son : certains téléphones refusent le son tant qu'on n'a pas touché l'écran une seule fois.
  // Au premier toucher n'importe où dans l'application, on relance le son s'il attend.
  useEffect(() => {
    const relancer = () => {
      try { const a = audioRef.current; if (a && a.srcObject && a.paused) a.play().catch(() => {}); } catch {}
    };
    document.addEventListener("pointerdown", relancer);
    document.addEventListener("touchstart", relancer);
    return () => { document.removeEventListener("pointerdown", relancer); document.removeEventListener("touchstart", relancer); };
    // eslint-disable-next-line
  }, []);

  // Sécurité : si l'application passe derrière une autre application, le micro se coupe tout seul
  useEffect(() => {
    const couperSiCache = () => { try { if (document.hidden && enEmissionRef.current) arreter(); } catch {} };
    document.addEventListener("visibilitychange", couperSiCache);
    return () => document.removeEventListener("visibilitychange", couperSiCache);
    // eslint-disable-next-line
  }, []);

  // Maintenir le bouton : le micro s'ouvre et la voix part EN DIRECT chez les autres
  const demarrer = async () => {
    if (enEmissionRef.current) return;
    setInfo("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setInfo("❌ Le micro n'est pas disponible sur cet appareil."); return; }
      if (typeof RTCPeerConnection === "undefined") { setInfo("❌ Ce navigateur ne supporte pas le talkie en direct."); return; }
      if (!canalRef.current) { setInfo("⚠️ Connexion en cours… attends une seconde et réessaie."); return; }
      enEmissionRef.current = true;
      const flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!enEmissionRef.current) { flux.getTracks().forEach(t => t.stop()); return; }
      fluxRef.current = flux;
      // Analyse du son du micro : sert à faire bouger les barres (preuve que le micro entend la voix)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(flux);
        const an = ctx.createAnalyser(); an.fftSize = 512;
        src.connect(an);
        analyseurRef.current = { ctx, an };
        const donnees = new Uint8Array(an.frequencyBinCount);
        boucleAnimRef.current = setInterval(() => {
          try {
            an.getByteFrequencyData(donnees);
            let somme = 0;
            for (let i = 0; i < donnees.length; i++) somme += donnees[i];
            setNiveau(Math.min(1, (somme / donnees.length) / 90));
          } catch {}
        }, 100);
      } catch {}
      // Analyse du son du micro : sert à faire bouger les barres (preuve que le micro entend la voix)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(flux);
        const an = ctx.createAnalyser(); an.fftSize = 512;
        src.connect(an);
        analyseurRef.current = { ctx, an };
        const donnees = new Uint8Array(an.frequencyBinCount);
        boucleAnimRef.current = setInterval(() => {
          try {
            an.getByteFrequencyData(donnees);
            let somme = 0;
            for (let i = 0; i < donnees.length; i++) somme += donnees[i];
            setNiveau(Math.min(1, (somme / donnees.length) / 90));
          } catch {}
        }, 100);
      } catch {}
      const telsEquipe = membresEquipe.map(c => (c.tel || "").trim());
      const telsAdmins = lesAdmins.map(c => (c.tel || "").trim());
      const cibles = (destinataire === "equipe"
        ? connectes.map(c => (c.tel || "").trim()).filter(t => telsEquipe.includes(t) || (!estAdmin && clientsTels.includes(t)))
        : destinataire === "admins"
          ? connectes.map(c => (c.tel || "").trim()).filter(t => telsAdmins.includes(t))
          : (connectes.map(c => (c.tel || "").trim()).includes(destinataire) ? [destinataire] : [])
      ).filter(Boolean);
      if (cibles.length === 0) {
        flux.getTracks().forEach(t => t.stop());
        fluxRef.current = null;
        enEmissionRef.current = false;
        setInfo("👤 Personne n'écoute pour le moment" + (destinataire === "equipe" ? " : personne de ton équipe n'a encore ouvert l'application." : destinataire === "admins" ? " : aucun admin n'a ouvert l'application." : " : cette personne n'a pas ouvert l'application."));
        return;
      }
      for (const tel of cibles) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] });
        flux.getTracks().forEach(t => pc.addTrack(t, flux));
        pc.onicecandidate = (e) => { if (e.candidate) signaler({ type: "cand", vers: tel, c: e.candidate }); };
        pcsRef.current[tel] = pc;
        const offre = await pc.createOffer();
        await pc.setLocalDescription(offre);
        signaler({ type: "offre", vers: tel, sdp: offre });
      }
      setEnEmission(true);
    } catch (e) {
      enEmissionRef.current = false;
      setEnEmission(false);
      setInfo("❌ Micro refusé ou indisponible : " + (e?.message || e) + " (autorise le micro dans ton navigateur).");
    }
  };

  // Relâcher le bouton : le micro se coupe automatiquement, la conversation s'arrête chez tout le monde
  const arreter = () => {
    if (!enEmissionRef.current) return;
    enEmissionRef.current = false;
    signaler({ type: "fin", vers: "groupe" });
    Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
    pcsRef.current = {};
    try { fluxRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    fluxRef.current = null;
    if (boucleAnimRef.current) { clearInterval(boucleAnimRef.current); boucleAnimRef.current = null; }
    try { analyseurRef.current?.ctx?.close?.(); } catch {}
    analyseurRef.current = null;
    setNiveau(0);
    setEnEmission(false);
  };

  if (!TALKIE_ROLES.includes(role)) return null;

  return (
    <div>
      {/* Bandeau rouge : quelqu'un te parle pendant que le talkie est fermé */}
      {!ouvert && enReception && (
        <div className="fixed bottom-24 right-4 z-50 bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-full shadow-2xl animate-pulse border-2 border-white max-w-[70vw] truncate">
          🔴 {nomQuiParle || "Quelqu'un"} te parle… écoute 🎧
        </div>
      )}

      {/* Gros bouton flottant du talkie-walkie */}
      {!ouvert && (
        <button
          className="fixed bottom-6 right-4 z-50 w-16 h-16 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-2xl shadow-2xl border-4 border-white active:scale-95 transition"
          onClick={() => setOuvert(true)}
          aria-label="Talkie-walkie">
          🎙️
        </button>
      )}

      {/* Écran du talkie-walkie */}
      {ouvert && (
        <Card className="fixed bottom-2 left-2 right-2 sm:left-auto sm:right-4 sm:w-[400px] z-50 h-[65vh] max-h-[540px] bg-white border shadow-2xl rounded-2xl flex flex-col overflow-hidden">
          <div className="bg-zinc-900 text-white p-3 flex items-center justify-between">
            <div className="font-bold">🎙️ Talkie-Walkie {enEmission ? "(EN DIRECT 🔴)" : ""}</div>
            <button className="text-white/70 hover:text-white text-lg" onClick={() => { arreter(); setOuvert(false); }}>✕</button>
          </div>

          {/* État en direct */}
          {(enEmission || enReception) && (
            <div className={"p-2 text-center font-bold text-white text-sm " + (enEmission ? "bg-red-600 animate-pulse" : "bg-blue-600")}>
              {enEmission ? "🔴 EN DIRECT : parle, ils t'entendent en même temps" : "🎧 " + (nomQuiParle || "Quelqu'un") + " parle : écoute…"}
            </div>
          )}

          {/* Choix de la destination : ton équipe, l'espace admins, ou une personne précise */}
          <div className="p-3 border-b bg-zinc-50 space-y-2">
            <Label className="text-xs">Qui doit t'entendre ?</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant={destinataire === "equipe" ? "default" : "outline"} className={destinataire === "equipe" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setDestinataire("equipe")}>👥 Mon équipe</Button>
              {estAdmin && (
                <Button variant={destinataire === "admins" ? "default" : "outline"} className={destinataire === "admins" ? "ring-2 ring-amber-600 ring-offset-1" : ""} onClick={() => setDestinataire("admins")}>👑 Espace Admins</Button>
              )}
              {contactsAutorises.map(c => (
                <Button key={c.tel} variant={destinataire === c.tel ? "default" : "outline"} className={destinataire === c.tel ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setDestinataire((c.tel || "").trim())}>
                  {c.role === "admin" ? "👑" : "👤"} {c.nom}
                </Button>
              ))}
              {!estAdmin && connectes.filter(c => clientsTels.includes((c.tel || "").trim())).map(c => (
                <Button key={"cli-" + c.tel} variant={destinataire === (c.tel || "").trim() ? "default" : "outline"} className={destinataire === (c.tel || "").trim() ? "ring-2 ring-green-600 ring-offset-1" : ""} onClick={() => setDestinataire((c.tel || "").trim())}>
                  🛍️ {c.nom || c.tel}
                </Button>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {connectes.length === 0
                ? "Personne n'a encore ouvert l'application MotoPièces. Dès qu'on l'ouvre (même en arrière-plan), on t'entend automatiquement."
                : "🎧 Connectés : " + connectes.map(c => c.nom || c.tel).join(", ")}
            </div>
          </div>

          {/* Explication simple */}
          <div className="flex-1 overflow-auto p-3 text-sm text-muted-foreground space-y-1">
            <p>Comment ça marche :</p>
            <p>1️⃣ Les autres ont juste leur application MotoPièces ouverte (même en arrière-plan, ils t'entendent).</p>
            <p>2️⃣ Tu maintiens le gros bouton et tu parles : ils t'entendent en même temps.</p>
            <p>3️⃣ Tu relâches : le micro se coupe automatiquement, la conversation s'arrête.</p>
          </div>

          {/* Le bouton passe au VERT dès que quelqu'un de la destination a ouvert son talkie (il nous attend), sinon il reste ROUGE */}
          {(() => {
            const presents = connectes.map(c => (c.tel || "").trim()).filter(Boolean);
            const ecoute = destinataire === "equipe"
              ? presents.some(t => membresEquipe.some(c => (c.tel || "").trim() === t) || clientsTels.includes(t))
              : destinataire === "admins"
                ? presents.some(t => lesAdmins.some(c => (c.tel || "").trim() === t))
                : presents.includes(destinataire);
            return (
          <div className="p-3 border-t bg-white">
            <button
              className={"w-full py-6 rounded-xl text-white font-bold text-lg shadow-md select-none " + (enEmission ? "bg-red-700 animate-pulse" : ecoute ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                demarrer();
              }}
              onPointerUp={arreter}
              onPointerCancel={arreter}
              onPointerLeave={arreter}
              onLostPointerCapture={arreter}
              onContextMenu={(e) => e.preventDefault()}>
              {enEmission
                ? (<span className="flex flex-col items-center gap-1">
                    <span className="flex items-end justify-center gap-1 h-7">
                  {[0.45, 0.75, 1, 0.75, 0.45].map((c, i) => (
                    <span key={i} className="w-2 rounded-sm bg-white inline-block" style={{ height: Math.max(4, Math.round(niveau * 26 * c)) + "px", transition: "height 0.1s" }} />
                  ))}
                </span>
                    <span>🔴 MIC ACTIF — ils t'entendent… relâche pour couper</span>
                  </span>)
                : ecoute ? "🎙️ MAINTIENS et PARLE — on t'attend ✅"
                : "🔴 Personne n'a l'application ouverte"}
            </button>
            {info && <p className="text-xs mt-2 text-zinc-700">{info}</p>}
          </div>
            );
          })()}
        </Card>
      )}

      {/* Élément audio invisible qui reçoit la voix de l'autre */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}

// ---------- Talkie-walkie du CLIENT : parler à TOUTE l'équipe de la boutique ----------
// Le client maintient le micro sur l'article : l'admin, les vendeurs et la secrétaire
// de cette boutique l'entendent EN MÊME TEMPS (s'ils ont ouvert leur talkie 🎙️).
// L'équipe peut aussi lui répondre : le client entend.
function TalkieClientArticle({ article, userActif, comptes }) {
  const [ouvert, setOuvert] = useState(false);
  const [enEmission, setEnEmission] = useState(false);
  const [enReception, setEnReception] = useState(false);
  const [nomQuiParle, setNomQuiParle] = useState("");
  const [info, setInfo] = useState("");
  const [connectes, setConnectes] = useState([]); // membres de l'équipe ayant le talkie ouvert
  const [relance, setRelance] = useState(0); // +1 quand il faut se rebrancher tout seul
  const gardeRef = useRef(null); // lecteur de silence qui garde le son actif en arrière-plan
  const canalRef = useRef(null);
  const pcsRef = useRef({});
  const fluxRef = useRef(null);
  const audioRef = useRef(null);
  const enEmissionRef = useRef(false);
  const [niveau, setNiveau] = useState(0); // 0 à 1 : force de la voix (pour les barres animées)
  const analyseurRef = useRef(null);
  const boucleAnimRef = useRef(null);

  const monTel = (userActif?.tel || "").trim();
  const monNom = (userActif?.nom || "Client").trim();
  const telProprietaire = (article?.equipe || "").trim();
  // Toute l'équipe de la boutique de l'article : l'admin propriétaire + ses vendeurs et secrétaires
  // Seuls les VENDEURS et les SECRÉTAIRES de la boutique entendent le client (jamais l'admin)
  const equipeBoutique = (comptes || []).filter(c =>
    ["vendeur", "vendeur-secretaire", "secretaire"].includes(c.role) && (c.tel || "").trim() && (c.tel || "").trim() !== monTel &&
    (telProprietaire === "" || (c.tel || "").trim() === telProprietaire || (c.equipe || "").trim() === telProprietaire));
  const telsEquipe = equipeBoutique.map(c => (c.tel || "").trim());

  const signaler = (payload) => {
    try { canalRef.current?.send?.({ type: "broadcast", event: "signal", payload: { ...payload, de: monTel, nomDe: monNom + " (client)" } }); } catch {}
  };

  const couperReception = (telEmetteur) => {
    try {
      if (telEmetteur && pcsRef.current[telEmetteur]) {
        try { pcsRef.current[telEmetteur].close(); } catch {}
        delete pcsRef.current[telEmetteur];
      } else {
        Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
        pcsRef.current = {};
      }
    } catch {}
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.srcObject = null; } catch {} }
    setEnReception(false);
    setNomQuiParle("");
  };

  // Quelqu'un de l'équipe maintient son bouton : le client l'écoute en direct
  const ecouterOffre = async (p) => {
    if (typeof RTCPeerConnection === "undefined") return;
    if (!telsEquipe.includes((p.de || "").trim())) return;
    try {
      couperReception();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] });
      pc.onicecandidate = (e) => { if (e.candidate) signaler({ type: "cand", vers: p.de, c: e.candidate }); };
      pc.ontrack = (e) => {
        try {
          const audio = audioRef.current;
          if (!audio) return;
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
          setEnReception(true);
          setNomQuiParle(p.nomDe || p.de);
          try { navigator.vibrate && navigator.vibrate(200); } catch {}
          // Pas de notification à autoriser : la voix sort toute seule par le haut-parleur.
        } catch {}
      };
      pc.oniceconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.iceConnectionState)) couperReception(p.de);
      };
      await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      const reponse = await pc.createAnswer();
      await pc.setLocalDescription(reponse);
      signaler({ type: "reponse", vers: p.de, sdp: reponse });
      pcsRef.current[p.de] = pc;
    } catch (e) {
      console.warn("Talkie client : impossible d'écouter", e);
    }
  };

  const traiterSignal = (p) => {
    if (!p || p.de === monTel) return;
    if (p.type !== "fin" && p.vers !== "groupe" && p.vers !== monTel) return;
    if (p.type === "offre") { ecouterOffre(p); return; }
    if (p.type === "reponse") {
      const pc = pcsRef.current[p.de];
      if (pc) pc.setRemoteDescription(new RTCSessionDescription(p.sdp)).catch(() => {});
      return;
    }
    if (p.type === "cand") {
      const pc = pcsRef.current[p.de];
      if (pc) pc.addIceCandidate(new RTCIceCandidate(p.c)).catch(() => {});
      return;
    }
    if (p.type === "fin") couperReception(p.de);
  };

  // Ouverture : le client rejoint le canal du talkie et voit qui est connecté
  useEffect(() => {
    if (!monTel) return; // le talkie se connecte tout seul dès que l'application est ouverte
    let canal = null;
    try {
      canal = supabase.channel("talkie-walkie", { config: { presence: { key: monTel }, broadcast: { self: false } } });
      canalRef.current = canal;
      canal.on("presence", { event: "sync" }, () => {
        try {
          const liste = Object.values(canal.presenceState()).flat();
          setConnectes(liste.filter(c => (c.tel || "").trim() !== monTel && telsEquipe.includes((c.tel || "").trim())));
        } catch {}
      });
      canal.on("broadcast", { event: "signal" }, ({ payload }) => traiterSignal(payload));
      canal.subscribe((statut) => {
        if (statut === "SUBSCRIBED") { try { canal.track({ nom: monNom, tel: monTel }); } catch {} }
      });
    } catch (e) {
      setInfo("⚠️ Connexion impossible : " + (e?.message || e));
    }
    return () => {
      if (enEmissionRef.current) signaler({ type: "fin", vers: "groupe" });
      try { canal?.unsubscribe?.(); } catch {}
      canalRef.current = null;
      couperReception();
    };
    // eslint-disable-next-line
  }, [monTel, relance]);

  // Chien de garde : si la connexion du talkie est tombée (réseau, veille, écran éteint), on se rebranche tout seul.
  // On vérifie aussi à chaque fois qu'on revient sur l'application.
  useEffect(() => {
    if (!monTel) return;
    const verifier = () => { if (!canalRef.current) setRelance((x) => x + 1); };
    const chien = setInterval(verifier, 8000);
    document.addEventListener("visibilitychange", verifier);
    return () => { clearInterval(chien); document.removeEventListener("visibilitychange", verifier); };
    // eslint-disable-next-line
  }, [monTel]);

  // GARDE DU SON EN ARRIÈRE-PLAN : au premier toucher de l'écran (n'importe où),
  // on lance 1 seconde de silence en boucle, volume 0. Le téléphone croit qu'on écoute de la musique,
  // donc il laisse le talkie marcher même si l'application passe derrière, même écran éteint.
  // Aucune autorisation à donner : le son de la voix sort tout seul par le haut-parleur.
  useEffect(() => {
    const demarrerGarde = () => {
      try {
        if (gardeRef.current) return;
        const a = document.createElement("audio");
        a.src = faireSilence(); a.loop = true; a.volume = 0;
        a.setAttribute("playsinline", ""); a.setAttribute("webkit-playsinline", "");
        const promesse = a.play();
        if (promesse && promesse.then) promesse.then(() => { gardeRef.current = a; }).catch(() => { try { a.pause(); } catch {} });
        else gardeRef.current = a;
      } catch {}
    };
    document.addEventListener("pointerdown", demarrerGarde, { once: true });
    document.addEventListener("touchstart", demarrerGarde, { once: true });
    return () => { document.removeEventListener("pointerdown", demarrerGarde); document.removeEventListener("touchstart", demarrerGarde); };
    // eslint-disable-next-line
  }, []);

  // Déblocage du son : certains téléphones refusent le son tant qu'on n'a pas touché l'écran une seule fois.
  // Au premier toucher n'importe où dans l'application, on relance le son s'il attend.
  useEffect(() => {
    const relancer = () => {
      try { const a = audioRef.current; if (a && a.srcObject && a.paused) a.play().catch(() => {}); } catch {}
    };
    document.addEventListener("pointerdown", relancer);
    document.addEventListener("touchstart", relancer);
    return () => { document.removeEventListener("pointerdown", relancer); document.removeEventListener("touchstart", relancer); };
    // eslint-disable-next-line
  }, []);

  // Sécurité : si l'application passe derrière une autre application, le micro se coupe tout seul
  useEffect(() => {
    const couperSiCache = () => { try { if (document.hidden && enEmissionRef.current) arreter(); } catch {} };
    document.addEventListener("visibilitychange", couperSiCache);
    return () => document.removeEventListener("visibilitychange", couperSiCache);
    // eslint-disable-next-line
  }, []);

  // Maintenir : le micro s'ouvre et la voix part EN DIRECT chez TOUTE l'équipe de la boutique
  const demarrer = async () => {
    if (enEmissionRef.current) return;
    setInfo("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setInfo("❌ Le micro n'est pas disponible sur cet appareil."); return; }
      if (typeof RTCPeerConnection === "undefined") { setInfo("❌ Ce navigateur ne supporte pas le talkie en direct."); return; }
      if (!canalRef.current) { setInfo("⚠️ Connexion en cours… attends une seconde et réessaie."); return; }
      const cibles = connectes.map(c => (c.tel || "").trim()).filter(t => telsEquipe.includes(t));
      if (cibles.length === 0) {
        setInfo("👤 Personne n'écoute pour le moment : personne de la boutique n'a encore ouvert l'application.");
        return;
      }
      enEmissionRef.current = true;
      const flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!enEmissionRef.current) { flux.getTracks().forEach(t => t.stop()); return; }
      fluxRef.current = flux;
      for (const tel of cibles) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] });
        flux.getTracks().forEach(t => pc.addTrack(t, flux));
        pc.onicecandidate = (e) => { if (e.candidate) signaler({ type: "cand", vers: tel, c: e.candidate }); };
        pcsRef.current[tel] = pc;
        const offre = await pc.createOffer();
        await pc.setLocalDescription(offre);
        signaler({ type: "offre", vers: tel, sdp: offre });
      }
      setEnEmission(true);
    } catch (e) {
      enEmissionRef.current = false;
      setEnEmission(false);
      setInfo("❌ Micro refusé ou indisponible : " + (e?.message || e) + " (autorise le micro dans ton navigateur).");
    }
  };

  // Relâcher : le micro se coupe automatiquement chez tout le monde
  const arreter = () => {
    if (!enEmissionRef.current) return;
    enEmissionRef.current = false;
    signaler({ type: "fin", vers: "groupe" });
    Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch {} });
    pcsRef.current = {};
    try { fluxRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    fluxRef.current = null;
    if (boucleAnimRef.current) { clearInterval(boucleAnimRef.current); boucleAnimRef.current = null; }
    try { analyseurRef.current?.ctx?.close?.(); } catch {}
    analyseurRef.current = null;
    setNiveau(0);
    setEnEmission(false);
  };

  return (
    <div>
      {/* Bandeau rouge : la boutique te parle pendant que le micro de l'article est fermé */}
      {!ouvert && enReception && (
        <div className="fixed bottom-24 left-4 z-50 bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-full shadow-2xl animate-pulse border-2 border-white max-w-[70vw] truncate">
          🔴 {nomQuiParle || "La boutique"} te parle… écoute 🎧
        </div>
      )}

      {/* Petit bouton micro sur l'article */}
      {!ouvert && (
        <button
          className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-full px-2 py-1 shadow active:scale-95 transition"
          onClick={() => setOuvert(true)}
          aria-label="Parler au vendeur">
          🎙️ Parler au vendeur
        </button>
      )}

      {/* Écran du talkie client */}
      {ouvert && (
        <Card className="fixed bottom-2 left-2 right-2 z-50 bg-white border shadow-2xl rounded-2xl overflow-hidden">
          <div className="bg-green-700 text-white p-3 flex items-center justify-between">
            <div className="font-bold text-sm">🎙️ Talkie de l'article — {article?.nom || "article"}</div>
            <button className="text-white/70 hover:text-white text-lg" onClick={() => { arreter(); setOuvert(false); }}>✕</button>
          </div>

          {(enEmission || enReception) && (
            <div className={"p-2 text-center font-bold text-white text-sm " + (enEmission ? "bg-red-600 animate-pulse" : "bg-blue-600")}>
              {enEmission ? "🔴 EN DIRECT : parle, les vendeurs et la secrétaire t'entendent" : "🎧 " + (nomQuiParle || "Quelqu'un") + " parle : écoute…"}
            </div>
          )}

          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-1">
              1️⃣ La boutique a juste son application ouverte (même en arrière-plan). 2️⃣ Maintiens le gros bouton et parle : les vendeurs et la secrétaire de la boutique t'entendent automatiquement. 3️⃣ Relâche : le micro se coupe.
            </p>
            <div className="text-[11px] text-muted-foreground mb-2">
              {connectes.length === 0
                ? "🎧 Personne de la boutique n'a encore ouvert l'application."
                : "🎧 En ligne : " + connectes.map(c => c.nom || c.tel).join(", ")}
            </div>
            <button
              className={"w-full py-6 rounded-xl text-white font-bold text-lg shadow-md select-none " + (enEmission ? "bg-red-700 animate-pulse" : connectes.length > 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} demarrer(); }}
              onPointerUp={arreter}
              onPointerCancel={arreter}
              onPointerLeave={arreter}
              onLostPointerCapture={arreter}
              onContextMenu={(e) => e.preventDefault()}>
              {enEmission
                ? (<span className="flex flex-col items-center gap-1">
                    <span className="flex items-end justify-center gap-1 h-7">
                  {[0.45, 0.75, 1, 0.75, 0.45].map((c, i) => (
                    <span key={i} className="w-2 rounded-sm bg-white inline-block" style={{ height: Math.max(4, Math.round(niveau * 26 * c)) + "px", transition: "height 0.1s" }} />
                  ))}
                </span>
                    <span>🔴 MIC ACTIF — la boutique t'entend… relâche pour couper</span>
                  </span>)
                : connectes.length > 0 ? "🎙️ MAINTIENS et PARLE — la boutique t'attend ✅"
                : "🔴 Personne de la boutique n'est en ligne"}
            </button>
            {info && <p className="text-xs mt-2 text-zinc-700">{info}</p>}
          </div>
        </Card>
      )}

      {/* Élément audio invisible qui reçoit la voix de l'équipe */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}

// ---------- Messagerie médias (photos, vidéos, textes, vocaux) ----------
// Le contenu envoyé ne RESTE PAS sur le serveur : les personnes connectées le téléchargent
// dans la mémoire de leur téléphone (IndexedDB), et le serveur se vide automatiquement.
// Envoi : barre de progression pour voir que la vidéo/la photo est en train de partir.
// Médias : caméra directe OU importation depuis la galerie.

function idbOuvrir() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") { rej(new Error("IndexedDB indisponible")); return; }
    const r = indexedDB.open("motopieces-messagerie", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("messages", { keyPath: "cle" }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbMettre(msg) {
  try {
    const db = await idbOuvrir();
    await new Promise((res, rej) => {
      const tx = db.transaction("messages", "readwrite");
      tx.objectStore("messages").put(msg);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch {}
}

async function idbTout() {
  try {
    const db = await idbOuvrir();
    return await new Promise((res) => {
      const tx = db.transaction("messages", "readonly");
      const req = tx.objectStore("messages").getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => res([]);
    });
  } catch { return []; }
}

async function idbSupprimer(cle) {
  try {
    const db = await idbOuvrir();
    await new Promise((res) => {
      const tx = db.transaction("messages", "readwrite");
      tx.objectStore("messages").delete(cle);
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch {}
}

function MessagerieEquipe({ role, userActif, comptes }) {
  const [ouvert, setOuvert] = useState(false);
  const [canal, setCanal] = useState("equipe"); // "equipe" | "admins" | téléphone d'une personne
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [info, setInfo] = useState("");
  const [enVocal, setEnVocal] = useState(false);
  const [envoi, setEnvoi] = useState(null); // { type, contenu, pct, phase } : bulle d'envoi en cours
  const [notification, setNotification] = useState(null); // bandeau en haut : nouveau message reçu
  const [nonLus, setNonLus] = useState(0); // messages reçus pas encore ouverts
  const notifTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const arretAutoRef = useRef(null);
  const enVocalRef = useRef(false);
  const animEnvoiRef = useRef(null);
  const finListeRef = useRef(null);
  const inputPhotoCamRef = useRef(null);
  const inputFichierImportRef = useRef(null);
  const connusRef = useRef(new Set());

  const monTel = (userActif?.tel || "").trim();
  const monNom = userActif?.nom || "Moi";
  const estAdmin = role === "admin";

  // Mon équipe : uniquement les comptes créés par mon administrateur
  const cleEquipeDe = (c) => (c.role === "admin" ? (c.tel || "").trim() : (c.equipe || "defaut"));
  const maCle = estAdmin ? monTel : ((userActif?.equipe || "").trim() || "defaut");
  const membresEquipe = (comptes || []).filter(c =>
    TALKIE_ROLES.includes(c.role) && (c.tel || "").trim() && (c.tel || "").trim() !== monTel && cleEquipeDe(c) === maCle);
  const lesAdmins = (comptes || []).filter(c => c.role === "admin" && (c.tel || "").trim() !== monTel);

  const canalIdPerso = (tel) => "perso:" + [monTel, tel].sort().join("|");
  const idDuCanal = (c) => c === "equipe" ? "equipe:" + maCle : c === "admins" ? "admins" : canalIdPerso(c);
  const titreDuCanal = (c) => c === "equipe" ? "👥 Mon équipe" : c === "admins" ? "👑 Espace Admins" : "👤 " + (((comptes || []).find(x => (x.tel || "").trim() === c) || {}).nom || c);

  // À l'ouverture : on charge l'historique stocké dans la MÉMOIRE DU TÉLÉPHONE (rien ne reste en ligne)
  useEffect(() => {
    if (!ouvert) return;
    idbTout().then(tout => {
      const connus = new Set();
      tout.forEach(m => connus.add(m.cle));
      connusRef.current = connus;
      setMessages(tout.sort((a, b) => (a.id || 0) - (b.id || 0)));
    });
  }, [ouvert]);

  // Les personnes qui doivent télécharger un message (pour savoir quand tout le monde l'a)
  const destinatairesAttendus = (dest) => {
    if (dest === "admins") return [...lesAdmins.map(c => (c.tel || "").trim()), monTel];
    if (dest && dest.startsWith("equipe:")) return [...membresEquipe.map(c => (c.tel || "").trim()), monTel];
    if (dest && dest.startsWith("perso:")) return dest.slice("perso:".length).split("|");
    return [monTel];
  };

  // Réception : les messages RESTENT EN LIGNE jusqu'à ce que chacun les télécharge dans son téléphone
  // Le contrôle tourne TOUJOURS (même messagerie fermée) : une notification s'affiche en haut dès qu'un message arrive
  useEffect(() => {
    if (!monTel) return;
    let actif = true;
    const canaux = [
      "equipe:" + maCle,
      ...(estAdmin ? ["admins"] : []),
      ...membresEquipe.map(m => canalIdPerso((m.tel || "").trim())),
      ...(estAdmin ? lesAdmins.map(a => canalIdPerso((a.tel || "").trim())) : []),
    ];
    const verifier = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, destinataire, de, nom, type, contenu, date, telecharges")
          .in("destinataire", canaux)
          .order("id", { ascending: false })
          .limit(100);
        if (!actif || error || !data) return;
        const nouveaux = [];
        for (const m of data) {
          const cle = m.destinataire + "#" + m.id;
          if (connusRef.current.has(cle)) continue;
          connusRef.current.add(cle);
          const local = { cle, id: m.id, destinataire: m.destinataire, de: m.de, nom: m.nom, type: m.type, contenu: m.contenu, date: m.date, moi: m.de === monTel };
          await idbMettre(local); // stocké dans la mémoire du téléphone (IndexedDB)
          nouveaux.push(local);
          // Je marque que j'ai téléchargé ce message sur mon téléphone
          try {
            const deja = m.telecharges || "";
            const marque = deja.includes(monTel) ? deja : deja + monTel + ",";
            await supabase.from("messages").update({ telecharges: marque }).eq("id", m.id);
            // Quand TOUTES les personnes concernées l'ont téléchargé, il est effacé du serveur
            const attendus = destinatairesAttendus(m.destinataire);
            if (attendus.every(t => marque.includes(t))) {
              await supabase.from("messages").delete().eq("id", m.id);
            }
          } catch {}
        }
        if (nouveaux.length > 0) {
          setMessages(prev => [...prev, ...nouveaux].sort((a, b) => (a.id || 0) - (b.id || 0)));
          // Notification en haut de l'écran pour les messages REÇUS (pas les miens)
          const recus = nouveaux.filter(n => !n.moi);
          if (recus.length > 0 && !ouvert) {
            const dernier = recus[recus.length - 1];
            setNotification({ nom: dernier.nom || dernier.de || "Quelqu'un", type: dernier.type });
            setNonLus(p => p + recus.length);
            try { if (navigator.vibrate) navigator.vibrate(200); } catch {}
            if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
            notifTimerRef.current = setTimeout(() => setNotification(null), 8000);
          }
        }
      } catch {}
    };
    verifier();
    const t = setInterval(verifier, 4000);
    return () => { actif = false; clearInterval(t); };
  }, [ouvert, monTel, maCle, canal]);

  useEffect(() => {
    if (finListeRef.current) finListeRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, envoi, canal]);

  // Lecture d'un fichier en base64
  const lireBase64 = (fichier) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(fichier);
  });

  // Photo : on réduit la taille pour que l'envoi soit rapide même en 3G
  const compresserPhoto = (fichier) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxi = 900;
        const echelle = Math.min(1, maxi / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * echelle);
        canvas.height = Math.round(img.height * echelle);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        res(canvas.toDataURL("image/jpeg", 0.7).split(",")[1] || "");
      };
      img.onerror = rej;
      img.src = r.result;
    };
    r.onerror = rej;
    r.readAsDataURL(fichier);
  });

  // Barre de progression : on voit que le message est EN TRAIN DE PARTIR
  const demarrerBarre = (type) => {
    let pct = 5;
    setEnvoi({ type, pct, phase: "préparation" });
    animEnvoiRef.current = setInterval(() => {
      pct = Math.min(95, pct + Math.random() * 12 + 4);
      setEnvoi(e => e ? { ...e, pct, phase: pct >= 50 ? "envoi" : "préparation" } : e);
    }, 300);
  };
  const finirBarre = () => {
    if (animEnvoiRef.current) { clearInterval(animEnvoiRef.current); animEnvoiRef.current = null; }
    setEnvoi(null);
  };

  // Envoi d'un message : il part vers le serveur, les connectés le téléchargent, puis le serveur se purge
  const envoyer = async (type, contenu) => {
    if (type === "texte" && !(contenu || "").trim()) return;
    setInfo("");
    const msg = {
      destinataire: idDuCanal(canal),
      de: monTel,
      nom: monNom,
      type,
      contenu: contenu || "",
      date: new Date().toISOString(),
    };
    if (type !== "texte") demarrerBarre(type);
    else setEnvoi({ type, pct: 50, phase: "envoi" });
    try {
      const { data, error } = await supabase.from("messages").insert(msg).select("id").single();
      if (error) {
        finirBarre();
        setInfo("⚠️ Envoi impossible : " + (error.message || "erreur") + ". Vérifie que la table « messages » a été créée dans Supabase.");
        return;
      }
      const local = { cle: msg.destinataire + "#" + (data?.id || Date.now()), id: data?.id || Date.now(), ...msg, moi: true };
      await idbMettre(local);
      connusRef.current.add(local.cle);
      setEnvoi(e => e ? { ...e, pct: 100, phase: "ok" } : e);
      setTimeout(() => {
        finirBarre();
        setMessages(prev => [...prev, local].sort((a, b) => (a.id || 0) - (b.id || 0)));
      }, 400);
    } catch (e) {
      finirBarre();
      setInfo("⚠️ Erreur réseau : " + (e?.message || e));
    }
  };

  // Importer un fichier : une seule option pour tout (photo OU vidéo, le fichier décide tout seul)
  const importerFichier = (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if ((fichier.type || "").startsWith("video")) choisirVideo(e);
    else choisirPhoto(e);
  };
  const choisirPhoto = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    try {
      const b64 = await compresserPhoto(fichier);
      await envoyer("photo", b64);
    } catch { finirBarre(); setInfo("❌ Impossible de lire cette photo."); }
  };

  const choisirVideo = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    if (fichier.size > 12 * 1024 * 1024) { setInfo("❌ Vidéo trop lourde (max 12 Mo). Filme un morceau plus court."); return; }
    try {
      const b64 = await lireBase64(fichier);
      await envoyer("video", b64);
    } catch { finirBarre(); setInfo("❌ Impossible de lire cette vidéo."); }
  };

  // Message vocal : maintenir le micro, relâcher pour envoyer (le micro se coupe dès qu'on relâche)
  const demarrerVocal = async () => {
    if (enVocalRef.current) return;
    enVocalRef.current = true;
    setInfo("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        enVocalRef.current = false;
        setInfo("❌ Le micro n'est pas disponible sur cet appareil."); return;
      }
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!enVocalRef.current) { flux.getTracks().forEach(t => t.stop()); return; }
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(t => MediaRecorder.isTypeSupported(t)) || "";
      const recorder = mime ? new MediaRecorder(flux, { mimeType: mime }) : new MediaRecorder(flux);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      recorder.onstop = async () => {
        flux.getTracks().forEach(t => t.stop());
        setEnVocal(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 300) { setInfo("Rien n'a été entendu. Maintiens le micro et parle."); return; }
        const b64 = await lireBase64(blob);
        envoyer("audio", b64);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setEnVocal(true);
      arretAutoRef.current = setTimeout(() => { try { recorder.stop(); } catch {} }, 30000);
    } catch (e) {
      enVocalRef.current = false;
      setEnVocal(false);
      setInfo("❌ Micro refusé ou indisponible : " + (e?.message || e) + ".");
    }
  };

  const arreterVocal = () => {
    if (!enVocalRef.current) return;
    enVocalRef.current = false;
    if (arretAutoRef.current) { clearTimeout(arretAutoRef.current); arretAutoRef.current = null; }
    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop(); } catch {}
    mediaRecorderRef.current = null;
    setEnVocal(false);
  };

  // Lecture d'un vocal : barre de progression + durée affichée (0:12 / 2:03), pour savoir si c'est fini ou pas
  const [lecture, setLecture] = useState(null); // { cle, courant, duree }
  const audioLectureRef = useRef(null);

  const formaterDuree = (s) => {
    if (!Number.isFinite(s) || s < 0) return "—:—";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return min + ":" + String(sec).padStart(2, "0");
  };

  const ecouterVocal = (m) => {
    try {
      if (audioLectureRef.current) { try { audioLectureRef.current.pause(); } catch {} }
      const cle = m.cle || String(m.id);
      const a = new Audio("data:audio/webm;base64," + m.contenu);
      audioLectureRef.current = a;
      setLecture({ cle, courant: 0, duree: 0 });
      a.onloadedmetadata = () => setLecture(l => (l && l.cle === cle) ? { ...l, duree: a.duration } : l);
      a.ontimeupdate = () => setLecture(l => (l && l.cle === cle) ? { ...l, courant: a.currentTime } : l);
      a.onended = () => { audioLectureRef.current = null; setLecture(null); };
      a.play().catch(() => {});
    } catch {}
  };

  const arreterLecture = () => {
    try { audioLectureRef.current?.pause(); } catch {}
    audioLectureRef.current = null;
    setLecture(null);
  };

  // Supprimer un message (texte, photo, vidéo ou vocal)
  // - un message que TU as laissé : effacé du serveur ET de tous les endroits possibles
  // - un message reçu : effacé uniquement de TON téléphone
  const supprimerMessage = async (m) => {
    arreterLecture();
    const cle = m.cle || m.destinataire + "#" + m.id;
    try {
      if (m.moi || m.de === monTel) {
        // Mon message : plus personne ne pourra le recevoir
        await supabase.from("messages").delete().eq("id", m.id);
      }
    } catch {}
    await idbSupprimer(cle);
    connusRef.current.delete(cle);
    setMessages(prev => prev.filter(x => (x.cle || x.destinataire + "#" + x.id) !== cle));
  };

  const heureDe = (m) => {
    try { return new Date(m.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
  };

  const messagesDuCanal = messages.filter(m => m.destinataire === idDuCanal(canal));

  if (!TALKIE_ROLES.includes(role)) return null;

  return (
    <div>
      {/* Notification en haut : quelqu'un a envoyé une photo, une vidéo, un vocal ou un message */}
      {notification && !ouvert && (
        <button
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] w-[92%] sm:w-auto max-w-md bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-pulse"
          onClick={() => { setNotification(null); setNonLus(0); setOuvert(true); }}>
          <span className="text-2xl shrink-0">{notification.type === "photo" ? "📷" : notification.type === "video" ? "🎬" : notification.type === "audio" ? "🎤" : "💬"}</span>
          <span className="text-sm font-bold text-left">
            🔔 {notification.nom} t'a envoyé {notification.type === "photo" ? "une photo" : notification.type === "video" ? "une vidéo" : notification.type === "audio" ? "un vocal" : "un message"}
            <span className="block text-[11px] font-normal">Appuie ici pour ouvrir la messagerie</span>
          </span>
        </button>
      )}

      {/* Bouton flottant de la messagerie médias */}
      {!ouvert && (
        <button
          className="fixed bottom-6 left-4 z-50 w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 text-white text-2xl shadow-2xl border-4 border-white active:scale-95 transition"
          onClick={() => { setNonLus(0); setNotification(null); setOuvert(true); }}
          aria-label="Messagerie photos et vidéos">
          📷
          {nonLus > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center border-2 border-white">
              {nonLus}
            </span>
          )}
        </button>
      )}

      {/* Écran de discussion */}
      {ouvert && (
        <Card className="fixed bottom-2 left-2 right-2 sm:right-auto sm:left-4 sm:w-[400px] z-50 h-[80vh] max-h-[640px] bg-white border shadow-2xl rounded-2xl flex flex-col overflow-hidden">
          <div className="bg-green-700 text-white p-3 flex items-center justify-between">
            <div className="font-bold">📷 {titreDuCanal(canal)}</div>
            <button className="text-white/80 hover:text-white text-lg" onClick={() => { arreterVocal(); finirBarre(); setOuvert(false); }}>✕</button>
          </div>

          {/* Choix de la destination */}
          <div className="p-2 border-b bg-zinc-50 flex flex-wrap gap-2">
            <Button variant={canal === "equipe" ? "default" : "outline"} className={canal === "equipe" ? "ring-2 ring-green-600 ring-offset-1" : ""} onClick={() => setCanal("equipe")}>👥 Mon équipe ({membresEquipe.length})</Button>
            {estAdmin && (
              <Button variant={canal === "admins" ? "default" : "outline"} className={canal === "admins" ? "ring-2 ring-amber-600 ring-offset-1" : ""} onClick={() => setCanal("admins")}>👑 Admins ({lesAdmins.length})</Button>
            )}
            {membresEquipe.map(c => (
              <Button key={c.tel} variant={canal === c.tel ? "default" : "outline"} className={canal === c.tel ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setCanal((c.tel || "").trim())}>👤 {c.nom}</Button>
            ))}
            {estAdmin && lesAdmins.map(c => (
              <Button key={c.tel} variant={canal === c.tel ? "default" : "outline"} className={canal === c.tel ? "ring-2 ring-amber-600 ring-offset-1" : ""} onClick={() => setCanal((c.tel || "").trim())}>👑 {c.nom}</Button>
            ))}
          </div>

          {/* Bulles de messages (stockées dans la mémoire du téléphone) */}
          <div className="flex-1 overflow-auto p-3 space-y-2 bg-[#ece5dd]">
            {messagesDuCanal.length === 0 && envoi === null && (
              <p className="text-sm text-zinc-600 text-center">
                {canal === "admins"
                  ? "Espace privé entre administrateurs : envoyez une photo ou une vidéo pour demander qui a une pièce."
                  : "Aucun message. Envoie une photo, une vidéo, un texte ou un vocal."}
              </p>
            )}
            {messagesDuCanal.map((m, i) => {
              const moi = m.de === monTel || m.moi;
              const cleM = m.cle || String(m.id);
              const enCoursDeLecture = lecture && lecture.cle === cleM;
              return (
                <div key={cleM} className={"flex " + (moi ? "justify-end" : "justify-start")}>
                  <div className={"rounded-xl px-3 py-2 max-w-[80%] shadow-sm text-sm " + (moi ? "bg-[#d9fdd3] text-zinc-900" : "bg-white text-zinc-900")}>
                    {!moi && <div className="text-xs font-bold text-green-800">{m.nom || m.de}</div>}
                    {m.type === "texte" && <p className="whitespace-pre-wrap break-words">{m.contenu}</p>}
                    {m.type === "photo" && <img src={"data:image/jpeg;base64," + m.contenu} alt="" className="rounded-lg max-w-full" />}
                    {m.type === "video" && <video controls src={"data:video/mp4;base64," + m.contenu} className="rounded-lg max-w-full" />}
                    {m.type === "audio" && (
                      <div className="w-full">
                        <button className="flex items-center gap-2 font-semibold text-green-800"
                          onClick={() => (enCoursDeLecture ? arreterLecture() : ecouterVocal(m))}>
                          {enCoursDeLecture ? "⏸️" : "▶️"} 🎤 Vocal
                          {enCoursDeLecture && <span className="font-mono text-xs">{formaterDuree(lecture.courant)} / {formaterDuree(lecture.duree)}</span>}
                        </button>
                        {/* Tiret de progression : on voit le vocal avancer jusqu'à la fin */}
                        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-green-500 transition-all"
                            style={{ width: (enCoursDeLecture && lecture.duree > 0 ? Math.min(100, (lecture.courant / lecture.duree) * 100) : 0) + "%" }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <BoutonSupprimer label="🗑️" boutonClass="text-[11px] h-6 px-1.5" onSupprimer={() => supprimerMessage(m)} />
                      <div className="text-[10px] text-zinc-500">{heureDe(m)} ✓✓</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bulle d'envoi en cours : le signe montre que le message est EN TRAIN DE PARTIR */}
            {envoi && (
              <div className="flex justify-end">
                <div className="rounded-xl px-3 py-2 max-w-[80%] shadow-sm text-sm bg-[#d9fdd3]">
                  <div className="font-semibold text-zinc-800">
                    {envoi.type === "photo" ? "📷 Photo" : envoi.type === "video" ? "🎬 Vidéo" : envoi.type === "audio" ? "🎤 Vocal" : "💬 Message"}
                  </div>
                  <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden my-1">
                    <div className={"h-full " + (envoi.phase === "ok" ? "bg-green-600" : "bg-green-500 transition-all")} style={{ width: envoi.pct + "%" }} />
                  </div>
                  <div className="text-[10px] text-zinc-600 text-right">
                    {envoi.phase === "préparation" ? "⏳ Préparation… " + Math.round(envoi.pct) + "%"
                      : envoi.phase === "envoi" ? "📤 Envoi en cours… " + Math.round(envoi.pct) + "%"
                      : "✅ Envoyé ✓✓"}
                  </div>
                </div>
              </div>
            )}
            <div ref={finListeRef} />
          </div>

          {/* Barre d'envoi : caméra directe / importation, texte, vocal */}
          <div className="p-2 border-t bg-white">
            <div className="flex flex-wrap gap-1 mb-1">
              <input ref={inputPhotoCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={choisirPhoto} />
              <input ref={inputFichierImportRef} type="file" accept="image/*,video/*" className="hidden" onChange={importerFichier} />
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => inputPhotoCamRef.current?.click()}>📷 Appareil photo</Button>
              <Button size="sm" variant="outline" onClick={() => inputFichierImportRef.current?.click()}>📥 Importer un fichier</Button>
            </div>
            <div className="flex items-center gap-1">
              <Input
                className="flex-1 min-w-[120px] h-10"
                placeholder="Écris ton message…"
                value={texte}
                onChange={e => setTexte(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { envoyer("texte", texte); setTexte(""); } }}
              />
              {texte.trim()
                ? <button className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white text-lg" title="Envoyer" onClick={() => { envoyer("texte", texte); setTexte(""); }}>➤</button>
                : <button
                    className={"w-10 h-10 rounded-full text-white text-lg select-none " + (enVocal ? "bg-red-600 animate-pulse" : "bg-green-600 hover:bg-green-700")}
                    style={{ touchAction: "none" }}
                    title="Maintiens pour parler, relâche pour envoyer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                      demarrerVocal();
                    }}
                    onPointerUp={arreterVocal}
                    onLostPointerCapture={arreterVocal}
                    onContextMenu={(e) => e.preventDefault()}>
                    {enVocal ? "⏺" : "🎤"}
                  </button>}
            </div>
            {info && <p className="text-xs mt-1 text-zinc-700">{info}</p>}
            <p className="text-[10px] text-zinc-400 mt-1">📥 Les messages restent en ligne jusqu'à ce que chaque personne concernée les télécharge sur son téléphone ; ensuite ils sont effacés du serveur. Même absent au moment de l'envoi, chacun reçoit son message à sa prochaine connexion.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------- Composant Section Publicités & Promotions avec Analyse Qualité Image ----------
function SectionPublicites({ publicites, setPublicites, autoriserUpload = false }) {
  const [openModal, setOpenModal] = useState(false);
  const [titre, setTitre] = useState("");
  const [image, setImage] = useState(null);
  const [analyse, setAnalyse] = useState(null);
  // Carrousel : une seule publicité affichée à la fois, changement automatique toutes les 3 secondes
  const [indexPub, setIndexPub] = useState(0);
  useEffect(() => {
    if (!publicites || publicites.length <= 1) return;
    const t = setInterval(() => {
      setIndexPub((i) => (i + 1) % publicites.length);
    }, 3000);
    return () => clearInterval(t);
  }, [publicites && publicites.length]);
  const pubVisible = publicites && publicites.length > 0 ? publicites[indexPub % publicites.length] : null;

  const handleUploadDirect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyse({ enCours: true, message: "🔍 Analyse automatique de la qualité et conformité de l'image en cours..." });

    const resultatAnalyse = await verifierQualiteImage(file);
    setImage(resultatAnalyse.dataUrl);

    if (resultatAnalyse.valide) {
      setAnalyse({ enCours: false, valide: true, message: resultatAnalyse.message });

      // Déclenchement automatique de la confirmation et redirection après analyse positive
      setTimeout(() => {
        const nouvellePub = {
          id: Date.now(),
          titre: titre.trim() || "Offre Spéciale MotoPièces",
          image: resultatAnalyse.dataUrl,
          date: new Date().toLocaleDateString("fr-FR"),
        };
        setPublicites((prev) => [nouvellePub, ...prev]);
        setTitre("");
        setImage(null);
        setAnalyse(null);
        setOpenModal(false);
      }, 1000);
    } else {
      setAnalyse({ enCours: false, valide: false, message: resultatAnalyse.message });
    }
  };

  const ajouterPublicite = () => {
    if (!image) return;
    const nouvellePub = {
      id: Date.now(),
      titre: titre.trim() || "Offre Spéciale MotoPièces",
      image,
      date: new Date().toLocaleDateString("fr-FR"),
    };
    setPublicites((prev) => [nouvellePub, ...prev]);
    setTitre("");
    setImage(null);
    setAnalyse(null);
    setOpenModal(false);
  };

  const supprimerPub = (id) => {
    setPublicites((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full px-3 sm:px-6 lg:px-8 mt-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          📢 Offres & Bannières Promotionnelles
        </h2>
        {autoriserUpload && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow"
            onClick={() => { setAnalyse(null); setOpenModal(true); }}
          >
            ➕ Publier une Image / Promo
          </Button>
        )}
      </div>

      {publicites.length === 0 ? (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none shadow-md">
          <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-lg">🚀 Nouveautés & Promotions MotoPièces !</p>
              <p className="text-xs text-blue-100 mt-1">
                Découvrez nos pièces de rechange d'origine au meilleur prix du marché.
              </p>
            </div>
            <Badge className="bg-amber-400 text-zinc-900 font-bold px-3 py-1 text-sm">
              🔥 Prix Cassés
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Card key={pubVisible.id} className="overflow-hidden shadow border bg-white">
            <div className="relative h-48 sm:h-64 bg-zinc-900 overflow-hidden">
              <img src={pubVisible.image} alt={pubVisible.titre} className="w-full h-full object-cover object-center" />
              {autoriserUpload && (
                <div className="absolute top-2 right-2">
                  <BoutonSupprimer label="🗑️ Supprimer" boutonClass="h-7 px-2 text-xs shadow bg-red-600 hover:bg-red-700 text-white"
                    onSupprimer={() => { supprimerPub(pubVisible.id); setIndexPub(0); }} />
                </div>
              )}
            </div>
            <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">{pubVisible.titre}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Publié le {pubVisible.date}</p>
              </div>
              <div className="flex items-center gap-1">
                {publicites.map((_, i) => (
                  <span key={i} className={"h-2 rounded-full transition-all " + (i === indexPub % publicites.length ? "w-5 bg-blue-600" : "w-2 bg-zinc-300")}></span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal d'upload de publicité (Admin seulement) */}
      {autoriserUpload && (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="bg-white rounded-lg p-6 max-w-md w-full">
            <DialogHeader>
              <DialogTitle>📢 Importation & Analyse de l'Image Promotionnelle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 mt-2">
              <Label>Titre / Description de l'offre</Label>
              <Input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex : Remise -15% sur les kits chaîne & freins"
              />
              <Label>Fichier Image (Import Direct)</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadDirect}
                className="border p-2 rounded text-sm w-full bg-zinc-50 cursor-pointer"
              />

              {/* Statut de vérification automatique */}
              {analyse && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  analyse.enCours
                    ? "bg-blue-50 text-blue-800 border border-blue-200 animate-pulse"
                    : analyse.valide
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  <span>{analyse.message}</span>
                </div>
              )}

              {image && (
                <div className="mt-2 h-40 rounded-lg border overflow-hidden bg-zinc-100 relative">
                  <img src={image} alt="Aperçu" className="w-full h-full object-cover object-center" />
                </div>
              )}

              <Button
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white h-11 font-bold"
                disabled={!image || (analyse && !analyse.valide)}
                onClick={ajouterPublicite}
              >
                ✅ Valider et Publier sur la Plateforme
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const COMPTES_PAR_DEFAUT = [
  { id: 1, nom: "Administrateur Principal", tel: "+225 05 55 44 89 45", pin: "5544", role: "admin" },
  { id: 2, nom: "Vendeur Exemple", tel: "+225 05 00 00 00 00", pin: "0000", role: "vendeur" }
];

// ---------- App ----------

// ====================== SÉCURITÉ ANTI-CLONAGE ======================
// L'application fonctionne uniquement sur les domaines autorisés :
// - les adresses locales (développement) : localhost, 127.0.0.1
// - les sites Vercel (*.vercel.app)
// - ton domaine personnel : mets-le dans DOMAINE_AUTORISE (ex : "motopieces.com")
// Si quelqu'un copie le site et le met sur un autre domaine, l'application se bloque.
const DOMAINE_AUTORISE = ""; // <- écris ici ton nom de domaine si tu en achètes un
const DOMAINE_OK = (() => {
  try {
    const h = ((typeof window !== "undefined" && window.location && window.location.hostname) || "").toLowerCase();
    if (!h) return true;
    const autorises = ["localhost", "127.0.0.1", DOMAINE_AUTORISE ? DOMAINE_AUTORISE.toLowerCase() : window.atob("LnZlcmNlbC5hcHA=")];
    return autorises.some(d => d && (h === d || h.endsWith("." + d) || h.endsWith(d)));
  } catch {
    return true;
  }
})();

export default function App() {
  const { user: supabaseUser, signOut: supabaseSignOut, loading: authLoading } = useAuth();
  const [role, setRole] = useState(() => {
    try { return localStorage.getItem("motopieces_role") || null; } catch { return null; }
  });
  const [userActif, setUserActif] = useState(() => {
    try { const s = localStorage.getItem("motopieces_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [publicites, setPublicites] = useState(() => {
    try { const s = localStorage.getItem("motopieces_publicites"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [boutiquesMasquees, setBoutiquesMasquees] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_boutiques_masquees");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [transfertsStock, setTransfertsStock] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_transferts_stock");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [openProfil, setOpenProfil] = useState(false);
  // Photo de profil : enregistrée en direct (téléphone + serveur) dès qu'on la choisit
  const [photoProfilMsg, setPhotoProfilMsg] = useState(false);
  const redimPhotoProfil = (src) => new Promise((res) => {
    try {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const T = 240;
        c.width = T; c.height = T;
        const ctx = c.getContext("2d");
        const cote = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, T, T);
        res(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => res(null);
      img.src = src;
    } catch { res(null); }
  });
  const changerPhotoProfil = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f || !userActif) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = await redimPhotoProfil(r.result);
      if (!dataUrl) return;
      setComptes(prev => prev.map(x => (x.tel || "").trim() === (userActif.tel || "").trim() ? { ...x, photo: dataUrl } : x));
      setUserActif(prev => ({ ...prev, photo: dataUrl }));
      try { synchroniserCompteSupabase({ ...userActif, photo: dataUrl }); } catch {}
      setPhotoProfilMsg(true);
      setTimeout(() => setPhotoProfilMsg(false), 2500);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [articleNegociation, setArticleNegociation] = useState(null);

  const negocierPrixArticle = (article) => {
    setArticleNegociation(article);
    setOpenChat(true);
  };
  const [erreurLogin, setErreurLogin] = useState("");
  const [telLogin, setTelLogin] = useState("");
  const [pinLogin, setPinLogin] = useState("");
  const [oubli, setOubli] = useState(false);
  const [oubliTel, setOubliTel] = useState("");
  const [oubliEtape, setOubliEtape] = useState(1);
  const [oubliCle, setOubliCle] = useState("");
  const [oubliPin, setOubliPin] = useState("");
  const [oubliPin2, setOubliPin2] = useState("");
  const [succesMsg, setSuccesMsg] = useState("");
  // Création de compte client : les clients peuvent créer leur compte eux-mêmes depuis la connexion
  const [creationCompte, setCreationCompte] = useState(false);
  const [nomCreation, setNomCreation] = useState("");
  const [telCreation, setTelCreation] = useState("");
  const [pinCreation, setPinCreation] = useState("");
  const [pinCreation2, setPinCreation2] = useState("");

  const creerCompteClient = () => {
    const tel = telCreation.trim();
    if (!nomCreation.trim()) { setErreurLogin("Entrez votre nom complet."); return; }
    if (!tel) { setErreurLogin("Entrez votre numéro de téléphone."); return; }
    if (pinCreation.length < 4) { setErreurLogin("Le code PIN doit avoir 4 chiffres."); return; }
    if (pinCreation !== pinCreation2) { setErreurLogin("Les deux codes PIN ne sont pas identiques."); return; }
    if (comptes.some(c => (c.tel || "").trim() === tel)) { setErreurLogin("Ce numéro a déjà un compte. Connectez-vous."); return; }
    const comp = { id: Date.now(), nom: nomCreation.trim(), tel, pin: pinCreation, role: "client", equipe: "clients" };
    setComptes(prev => [...prev, comp]);
    try { synchroniserCompteSupabase(comp); } catch (e) { console.warn(e); }
    setErreurLogin("");
    setNomCreation(""); setTelCreation(""); setPinCreation(""); setPinCreation2("");
    setCreationCompte(false);
    setUserActif(comp);
    setRole("client");
    setOpenLoginModal(false);
  };
  const [produits, setProduits] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_produits");
      if (s) return JSON.parse(s);
    } catch {}
    // Plus de catalogue par défaut : chaque vendeur ajoute ses propres marchandises.
    return [];
  });
  const [marques, setMarques] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES_DEFAUT);
  // Cases de rangement : l'admin numérote et nomme les cases où sont rangés les articles
  const [cases, setCases] = useState(() => {
    try { const s = localStorage.getItem("motopieces_cases"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [photosCategories, setPhotosCategories] = useState({});
  const [photosMarques, setPhotosMarques] = useState({});
  const [ventes, setVentes] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_ventes");
      if (!s) return [];
      // Nettoyage automatique : les ventes enregistrées par l'ancienne version buggée
      // (payées à 0 FCFA ou sans article) ne s'afficheront plus jamais.
      const ventesLocales = JSON.parse(s);
      if (!Array.isArray(ventesLocales)) return [];
      return ventesLocales.filter(v =>
        (v.items || []).length > 0 &&
        !(v.statut === "payée" && !(Number(v.total) > 0))
      );
    } catch { return []; }
  });
  const [comptes, setComptes] = useState(() => {
    try { const s = localStorage.getItem("motopieces_comptes"); return s ? JSON.parse(s) : COMPTES_PAR_DEFAUT; } catch { return COMPTES_PAR_DEFAUT; }
  });
  const [entreprise, setEntreprise] = useState(() => {
    try { const s = localStorage.getItem("motopieces_entreprise"); if (s) return JSON.parse(s); } catch {}
    return { nom: "MotoPièces", tel: "+225 05 55 44 89 45", materiel: "Pièces de moto" };
  });
  const [modePrix, setModePrix] = useState("admin");
  const [nextVente, setNextVente] = useState(() => {
    try { const s = localStorage.getItem("motopieces_next_vente"); return s ? Number(s) : 1; } catch { return 1; }
  });
  // Crédits / dettes : qui nous doit de l'argent, et à qui l'entreprise doit de l'argent
  const [credits, setCredits] = useState(() => {
    try { const s = localStorage.getItem("motopieces_credits"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [nextId, setNextId] = useState(113);
  const [menuDev, setMenuDev] = useState(false);
  const [codeOk, setCodeOk] = useState(false);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [nouvelAdmin, setNouvelAdmin] = useState({ nom: "", tel: "" });
  // Code développeur : jamais écrit en clair dans le code. Il est codé (base64)
  // et décodé uniquement en mémoire au moment de la vérification.
  const CODE_DEV = (() => { try { return window.atob("NTU0NDg5NA=="); } catch { return ""; } })();

  // Chargement et initialisation automatique des comptes enregistrés sur Supabase
  useEffect(() => {
    async function chargerComptesSupabase() {
      try {
        const { data, error } = await supabase.from("users").select("*");
        if (!error && data && data.length > 0) {
          setComptes(data);
        } else {
          // Si la table est vide, insérer les comptes par défaut dans Supabase
          for (const c of COMPTES_PAR_DEFAUT) {
            await synchroniserCompteSupabase(c);
          }
        }
      } catch (e) {
        console.warn("Notice initialisation comptes Supabase:", e);
      }
    }

    async function chargerVentesEnLigne() {
      try {
        const ventesEnLigne = await chargerVentesSupabase();
        // Correctif : fusion avec les ventes locales au lieu de les écraser.
        // On charge : toutes les ventes payées avec un total positif (historique définitif)
        // ET toutes les ventes en attente (la secrétaire doit les voir pour fixer les prix et valider).
        // On ignore seulement les lignes vides (aucun article) et les anciens doublons « payée à 0 FCFA ».
        const lignesValides = (ventesEnLigne || []).filter(s =>
          (s.items || []).length > 0 && (s.statut === "payée" ? Number(s.total) > 0 : true));
        if (lignesValides.length > 0) {
          setVentes(prev => {
            const idsConnus = new Set(prev.map(v => String(v.id)));
            (prev || []).forEach(v => { if (v.supabase_id) idsConnus.add(String(v.supabase_id)); });
            const nouvelles = lignesValides.filter(s => !idsConnus.has(String(s.id)));
            return nouvelles.length ? [...nouvelles, ...prev] : prev;
          });
        }
      } catch (e) {
        console.warn("Notice chargement ventes Supabase:", e);
      }
    }

    chargerComptesSupabase();
    chargerVentesEnLigne();
  }, []);

  // Synchronisation directe avec l'état d'authentification Supabase en ligne
  useEffect(() => {
    if (supabaseUser) {
      const userRole = supabaseUser.user_metadata?.role || "admin";
      setRole(userRole);
      setUserActif({
        id: supabaseUser.id,
        nom: supabaseUser.user_metadata?.nom || supabaseUser.email || "Utilisateur Supabase",
        tel: supabaseUser.phone || "",
        email: supabaseUser.email || "",
        role: userRole,
      });
    }
  }, [supabaseUser]);

  // Persistence automatique via localStorage
  useEffect(() => {
    try {
      if (role) localStorage.setItem("motopieces_role", role);
      else localStorage.removeItem("motopieces_role");
    } catch {}
  }, [role]);

  useEffect(() => {
    try {
      if (userActif) localStorage.setItem("motopieces_user", JSON.stringify(userActif));
      else localStorage.removeItem("motopieces_user");
    } catch {}
  }, [userActif]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_comptes", JSON.stringify(comptes)); } catch {}
  }, [comptes]);

  // Anti-capture d'écran : l'écran se floute aussitôt qu'on quitte l'application
  // ou qu'elle perd le focus. On ne peut pas lire l'écran depuis une autre application.
  useEffect(() => {
    const flouter = () => { try { document.body.classList.add("ecran-protege"); } catch {} };
    const deflouter = () => { try { document.body.classList.remove("ecran-protege"); } catch {} };
    const surVisibilite = () => { if (document.hidden) flouter(); else deflouter(); };
    const bloquerMenu = (e) => { try { e.preventDefault(); } catch {} };
    window.addEventListener("blur", flouter);
    window.addEventListener("focus", deflouter);
    document.addEventListener("visibilitychange", surVisibilite);
    document.addEventListener("contextmenu", bloquerMenu);
    return () => {
      window.removeEventListener("blur", flouter);
      window.removeEventListener("focus", deflouter);
      document.removeEventListener("visibilitychange", surVisibilite);
      document.removeEventListener("contextmenu", bloquerMenu);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("motopieces_ventes", JSON.stringify(ventes)); } catch {}
  }, [ventes]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_produits", JSON.stringify(produits)); } catch {}
  }, [produits]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_entreprise", JSON.stringify(entreprise)); } catch {}
  }, [entreprise]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_next_vente", String(nextVente)); } catch {}
  }, [nextVente]);

  // Sauvegarde automatique des cases de rangement (numéro + nom)
  useEffect(() => {
    try { localStorage.setItem("motopieces_cases", JSON.stringify(cases)); } catch {}
  }, [cases]);

  // Sauvegarde automatique des crédits / dettes
  useEffect(() => {
    try { localStorage.setItem("motopieces_credits", JSON.stringify(credits)); } catch {}
  }, [credits]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_publicites", JSON.stringify(publicites)); } catch {}
  }, [publicites]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_boutiques_masquees", JSON.stringify(boutiquesMasquees)); } catch {}
  }, [boutiquesMasquees]);

  useEffect(() => {
    try { localStorage.setItem("motopieces_transferts_stock", JSON.stringify(transfertsStock)); } catch {}
  }, [transfertsStock]);

  const basculerVisibiliteBoutique = (nomBoutique) => {
    setBoutiquesMasquees(prev =>
      prev.includes(nomBoutique)
        ? prev.filter(b => b !== nomBoutique)
        : [...prev, nomBoutique]
    );
  };

  const effectuerTransfertStock = (idProduit, boutiqueSource, boutiqueCible, quantite) => {
    const qteNum = Number(quantite);
    const p = produits.find(item => item.id === Number(idProduit));
    if (!p || !qteNum || qteNum <= 0 || qteNum > p.stock) {
      return { success: false, message: "Quantité invalide ou stock disponible insuffisant dans ce magasin." };
    }

    const nouveauTransfert = {
      id: Date.now(),
      produitId: p.id,
      produitNom: p.nom,
      boutiqueSource: boutiqueSource || p.boutique || "MotoPièces Principal",
      boutiqueCible: boutiqueCible || "Autre Magasin",
      quantite: qteNum,
      statut: "en_attente",
      date: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      emetteur: userActif?.nom || "Administrateur",
    };

    setTransfertsStock(prev => [nouveauTransfert, ...prev]);
    return { success: true, message: "Transfert de stock initié avec succès ! En attente de validation." };
  };

  const validerTransfertStock = (idTransfert) => {
    const t = transfertsStock.find(item => item.id === idTransfert);
    if (!t || t.statut === "valide") return;

    // Décrémenter du stock d'origine et valider le transfert
    setProduits(prev => prev.map(p => {
      if (p.id === t.produitId) {
        return {
          ...p,
          stock: Math.max(0, p.stock - t.quantite),
        };
      }
      // Correctif : le stock transféré arrive bien dans le magasin cible si l'article y existe
      if (p.nom === t.produitNom && p.boutique === t.boutiqueCible) {
        return {
          ...p,
          stock: (p.stock || 0) + t.quantite,
        };
      }
      return p;
    }));

    setTransfertsStock(prev => prev.map(item => item.id === idTransfert ? { ...item, statut: "valide" } : item));
  };

  // Connexion sécurisée : téléphone + code PIN
  const connexion = (tel, pin) => {
    const c = comptes.find(x => (x.tel || "").trim() === (tel || "").trim());
    if (!c) { setErreurLogin("Aucun compte n'est associé à ce téléphone."); return; }
    if ((c.pin || "") !== (pin || "").trim()) { setErreurLogin("Code PIN incorrect."); return; }
    if (c.bloque) { setErreurLogin("Ce compte est bloqué. Contactez l'administrateur."); return; }
    setErreurLogin("");
    setUserActif(c);
    setRole(c.role);
    setOpenLoginModal(false);
  };

  const deconnexion = async () => {
    setRole(null);
    setUserActif(null);
    try {
      localStorage.removeItem("motopieces_role");
      localStorage.removeItem("motopieces_user");
      await supabaseSignOut();
    } catch (e) {
      console.warn("Erreur déconnexion Supabase:", e);
    }
  };

  const creerVente = async (v) => {
    const maintenant = new Date();
    const dateVente = maintenant.toLocaleDateString("fr-FR") + " à " + maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // Calcul garanti du total et sécurisation des articles de la commande
    const itemsVente = (v.items || []).map(it => ({
      ...it,
      prixLigne: it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0,
      qte: it.qte || 1,
    }));

    const totalVenteCalcule = v.total || itemsVente.reduce((s, it) => s + (it.prixLigne * it.qte), 0);
    const premierProduit = itemsVente[0]?.p || itemsVente[0];
    const nomBoutique = premierProduit?.boutique || v.vendeur || userActif?.nom || entreprise.nom || "MotoPièces Principal";

    // ---------- Vente à crédit ----------
    // La marchandise sort tout de suite ; un crédit lié à la commande est créé pour suivre les versements.
    let idCreditLie = null;
    if (v.credit) {
      const dejaPaye = Math.max(0, Math.min(Number(v.dejaPaye) || 0, totalVenteCalcule));
      idCreditLie = Date.now();
      const soldeToutDeSuite = dejaPaye >= totalVenteCalcule;
      setCredits(prev => [{
        id: idCreditLie,
        type: "recevoir",
        nom: v.client || "Client",
        tel: v.tel || "",
        montant: totalVenteCalcule,
        venteId: nextVente, // lien avec la commande : quand le crédit est soldé, la commande devient « payée »
        versements: dejaPaye > 0 ? [{
          montant: dejaPaye,
          date: dateVente,
          par: userActif?.nom || "—",
        }] : [],
        statut: soldeToutDeSuite ? "payé" : "en cours",
        dateCreation: dateVente,
        dateValidation: soldeToutDeSuite ? dateVente : null,
        enregistrePar: userActif?.nom || "—",
      }, ...prev]);
    }

    const nouvelleVente = {
      ...v,
      id: nextVente,
      items: itemsVente,
      total: totalVenteCalcule,
      vendeur: nomBoutique,
      boutique: nomBoutique,
      statut: v.credit ? "crédit" : "en attente",
      creditId: idCreditLie, // lien inverse : quand la secrétaire confirme le paiement total, le crédit se solde aussi
      date: dateVente,
    };

    setVentes(prev => [nouvelleVente, ...prev]);
    setNextVente(n => n + 1);

    // Enregistrement de la transaction dans la table d'historique des ventes Supabase (public.sales & public.sale_items)
    // On garde l'identifiant serveur (supabase_id) : à la validation, on mettra à jour CETTE ligne
    // (total réel + prix réels) au lieu d'insérer une seconde ligne à 0 FCFA.
    const resultatSupabase = await enregistrerVenteSupabase(nouvelleVente);
    const idSupabase = resultatSupabase?.data?.id;
    if (idSupabase) {
      setVentes(prev => prev.map(v => v.id === nouvelleVente.id ? { ...v, supabase_id: idSupabase } : v));
    }

    // Décrément automatique du stock : 10 vendus → il reste 9
    setProduits(prev => prev.map(p => {
      const ligne = itemsVente.find(it => (it.p ? it.p.id : it.id) === p.id);
      if (!ligne) return p;
      const q = ligne.qte || 1;
      return { ...p, stock: Math.max(0, p.stock - q) };
    }));
  };

  const confirmerPaiement = async (id) => {
    let venteValidee = null;
    setVentes(prev => prev.map(v => {
      if (v.id !== id) return v;
      const total = v.items.reduce((s, it) => s + (it.prixLigne ?? (it.p ? it.p.prix : it.prix)) * (it.qte || 1), 0);
      venteValidee = { ...v, statut: "payée", total };
      return venteValidee;
    }));

    // Vente à crédit : si la secrétaire confirme le paiement total, le crédit lié se solde aussi
    if (venteValidee?.creditId) {
      const maintenant = new Date();
      const dateValidation = maintenant.toLocaleDateString("fr-FR") + " à " + maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setCredits(prev => prev.map(c => {
        if (c.id !== venteValidee.creditId) return c;
        const payeAvant = (c.versements || []).reduce((s, v) => s + (v.montant || 0), 0);
        const reste = Math.max(0, (c.montant || 0) - payeAvant);
        const versements = reste > 0
          ? [...(c.versements || []), { montant: reste, date: dateValidation, par: userActif?.nom || "—" }]
          : (c.versements || []);
        return { ...c, versements, statut: "payé", dateValidation: c.dateValidation || dateValidation };
      }));
    }

    if (venteValidee) {
      // Mise à jour de la vente en ligne (prix réels + statut payée) — plus de doublon à 0 FCFA
      await majVenteSupabase(venteValidee);
    }
  };

  // ---------- Marchandises ajoutées par le vendeur ----------
  const ajouterProduitVendeur = (p) => {
    setProduits(prev => {
      const id = prev.length ? Math.max(...prev.map(x => Number(x.id) || 0)) + 1 : 1;
      return [...prev, {
        ...p,
        id,
        code: "ART-" + String(id).padStart(3, "0"),
        stockInit: Number(p.stock) || 0,
        note: 4.0,
        equipe: (p.equipe || (userActif?.equipe || "")).trim(), // équipe du vendeur : le téléphone de son administrateur
      }];
    });
  };

  const supprimerProduitVendeur = (id) => {
    setProduits(prev => prev.filter(x => x.id !== id));
  };

  // ---------- Crédits / Dettes (vendeur & secrétaire) ----------
  const ajouterCredit = (c) => {
    const maintenant = new Date();
    setCredits(prev => [{
      ...c,
      id: Date.now(),
      versements: [],
      statut: "en cours",
      dateCreation: maintenant.toLocaleDateString("fr-FR") + " à " + maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      enregistrePar: userActif?.nom || "—",
    }, ...prev]);
  };

  const ajouterVersement = (idCredit, montant) => {
    const maintenant = new Date();
    setCredits(prev => prev.map(c => c.id === idCredit ? {
      ...c,
      versements: [...(c.versements || []), {
        montant: Number(montant) || 0,
        date: maintenant.toLocaleDateString("fr-FR") + " à " + maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        par: userActif?.nom || "—",
      }],
    } : c));
  };

  const validerCredit = (idCredit) => {
    const mtn = new Date();
    const dateValidation = mtn.toLocaleDateString("fr-FR") + " à " + mtn.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    let venteALier = null;
    setCredits(prev => prev.map(c => {
      if (c.id !== idCredit) return c;
      if (c.venteId) venteALier = c.venteId;
      return { ...c, statut: "payé", dateValidation };
    }));
    // Vente à crédit soldée : la commande liée passe en « payée » aussi (côté local + serveur)
    if (venteALier != null) {
      let venteMaj = null;
      setVentes(prev => prev.map(v => {
        if (v.id !== venteALier) return v;
        venteMaj = { ...v, statut: "payée" };
        return venteMaj;
      }));
      if (venteMaj) majVenteSupabase(venteMaj);
    }
  };

  // La secrétaire peut fixer le prix de chaque ligne avant de confirmer
  const majPrixLigne = (idVente, index, prix) => {
    setVentes(prev => prev.map(v => v.id === idVente ? {
      ...v,
      items: v.items.map((it, j) => j === index ? { ...it, prixLigne: prix } : it),
    } : v));
  };

  const genererMarque = (m) => {
    // Désactivé : les marchandises ne sont plus générées automatiquement.
    void m;
  };

  // Oubli de code PIN : les clients/vendeurs/secrétaires utilisent une clé donnée par l'admin
  const verifierTelOubli = () => {
    const c = comptes.find(x => (x.tel || "").trim() === oubliTel.trim());
    if (!c) { setErreurLogin("Aucun compte n'est associé à ce téléphone."); return; }
    if (c.role === "admin") { setErreurLogin("👑 Compte administrateur — contactez le développeur pour réinitialiser votre code PIN."); return; }
    setErreurLogin(""); setOubliEtape(2);
  };

  const reinitialiserPin = () => {
    const c = comptes.find(x => (x.tel || "").trim() === oubliTel.trim());
    if (!c) { setErreurLogin("Aucun compte n'est associé à ce téléphone."); return; }
    if (!c.cle || c.cle !== oubliCle.trim()) { setErreurLogin("Clé de réinitialisation incorrecte. Demandez-la à l'administrateur."); return; }
    if (oubliPin.length < 4 || oubliPin !== oubliPin2) { setErreurLogin("Les deux codes PIN doivent être identiques (4 chiffres)."); return; }
    setComptes(prev => prev.map(x => x.id === c.id ? { ...x, pin: oubliPin, cle: null } : x));
    setSuccesMsg("Code PIN modifié avec succès ! Connectez-vous avec votre nouveau PIN.");
    setOubli(false); setOubliEtape(1); setOubliTel(""); setOubliCle(""); setOubliPin(""); setOubliPin2(""); setErreurLogin("");
  };

  // Sécurité : domaine non autorisé (site cloné / copié) => application bloquée
  if (!DOMAINE_OK) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white p-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="text-5xl">⛔</div>
          <p className="text-xl font-bold">Application non autorisée</p>
          <p className="text-sm text-zinc-400">Cette copie de MotoPièces n'est pas autorisée. Rendez-vous sur le site officiel MotoPièces.</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-zinc-400">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  const r = ROLES.find(x => x.id === role) || { emoji: "🧑‍🔧👩‍💼", titre: "Vendeur + Secrétaire" };

  return (
    <div className="min-h-screen bg-zinc-100 pb-10">
      {/* En-tête principal : Titre MotoPièces tout en haut, Bouton de Connexion / Profil en haut à droite */}
      <header className="bg-zinc-900 text-white sticky top-0 z-20 shadow">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Bloc Gauche : Bouton Se connecter sur Mobile (en haut à gauche) + Logo & Titre MotoPièces */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!role && (
              <Button
                className="md:hidden bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 h-9 shadow shrink-0"
                onClick={() => { setOpenLoginModal(true); setErreurLogin(""); setSuccesMsg(""); }}
              >
                🔐 Se connecter
              </Button>
            )}

            {/* Logo & Titre MotoPièces (option développeur visible uniquement côté client / non connecté) */}
            {(!role || role === "client") && (
              <BoutonSupprimer label={<><IconeMoto /> <span className="text-lg sm:text-xl font-extrabold tracking-wide">{entreprise.nom || "MotoPièces"}</span><span className="block text-[10px] font-normal text-white/60 leading-tight">🛍️ {entreprise.materiel} — 📞 {entreprise.tel}</span></>} duree={10000}
                boutonClass="text-white hover:bg-white/10 text-left rounded p-1"
                onSupprimer={() => setMenuDev(true)} />
            )}
            {role && role !== "client" && (
              <div className="text-white flex items-center text-left rounded p-1">
                <IconeMoto /> <span className="text-lg sm:text-xl font-extrabold tracking-wide">{entreprise.nom || "MotoPièces"}</span>
                <span className="block text-[10px] font-normal text-white/60 leading-tight">🛍️ {entreprise.materiel} — 📞 {entreprise.tel}</span>
              </div>
            )}
            {role && <Badge variant="secondary" className="hidden sm:inline-flex">{r.emoji} {r.titre}</Badge>}
          </div>

          {/* Bloc Droit : Bouton Se connecter sur Ordinateur (en haut à droite) OR Profil si connecté */}
          <div className="flex items-center gap-2">
            {!role ? (
              <Button
                className="hidden md:inline-flex bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 h-10 shadow"
                onClick={() => { setOpenLoginModal(true); setErreurLogin(""); setSuccesMsg(""); }}
              >
                🔐 Se connecter
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 flex items-center gap-2"
                  onClick={() => setOpenProfil(true)}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="font-semibold text-xs max-w-[130px] sm:max-w-none truncate flex items-center gap-1">
                    {userActif?.photo
                      ? <img src={userActif.photo} alt="" className="w-6 h-6 rounded-full object-cover border border-zinc-500" />
                      : "👤"} {userActif?.nom || userActif?.tel || supabaseUser?.email || "Mon Profil"}
                  </span>
                </Button>

                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white text-xs" onClick={deconnexion}>
                  Déconnexion
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Interface de Saisie du Téléphone et Code PIN (Modal de Connexion) */}
      <Dialog open={openLoginModal} onOpenChange={setOpenLoginModal}>
        <DialogContent className="bg-white text-zinc-900 rounded-lg p-6 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">🔐 Connexion - MotoPièces</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 mt-2">
            {succesMsg && <p className="text-green-600 text-sm mb-1 text-center">✅ {succesMsg}</p>}
            {!oubli && !creationCompte ? (
              <>
                <Label>Numéro de téléphone</Label>
                <Input
                  autoFocus
                  inputMode="tel"
                  value={telLogin}
                  onChange={e => setTelLogin(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                />
                <Label className="pt-2">Code PIN (4 chiffres)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinLogin}
                  onChange={e => setPinLogin(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => { if (e.key === "Enter") connexion(telLogin, pinLogin); }}
                  placeholder="••••"
                />
                {erreurLogin && <p className="text-red-600 text-sm mt-1">{erreurLogin}</p>}
                <Button
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold shadow"
                  disabled={!telLogin.trim() || pinLogin.length < 4}
                  onClick={() => connexion(telLogin, pinLogin)}
                >
                  🔐 Valider la connexion
                </Button>
                <button className="text-sm text-blue-600 hover:underline mt-2 text-center" onClick={() => { setOubli(true); setErreurLogin(""); setSuccesMsg(""); }}>🔑 Code PIN oublié ?</button>
                <button className="text-sm font-semibold text-green-700 hover:underline mt-1 text-center" onClick={() => { setCreationCompte(true); setErreurLogin(""); setSuccesMsg(""); }}>🆕 Créer un compte client</button>
              </>
            ) : !oubli && creationCompte ? (
              <>
                <div className="font-semibold text-base text-center">🆕 Créer votre compte client</div>
                <p className="text-xs text-muted-foreground text-center">Avec ce compte, vous pouvez acheter chez n'importe quelle boutique MotoPièces.</p>
                <Label className="pt-2">Nom complet</Label>
                <Input autoFocus value={nomCreation} onChange={e => setNomCreation(e.target.value)} placeholder="Ex : Oumar Sekongo" />
                <Label className="pt-2">Numéro de téléphone</Label>
                <Input inputMode="tel" value={telCreation} onChange={e => setTelCreation(e.target.value)} placeholder="+225 07 00 00 00 00" />
                <Label className="pt-2">Code PIN (4 chiffres)</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={pinCreation} onChange={e => setPinCreation(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                <Label className="pt-2">Confirmez le code PIN</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={pinCreation2} onChange={e => setPinCreation2(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") creerCompteClient(); }} placeholder="••••" />
                {erreurLogin && <p className="text-red-600 text-sm mt-1">{erreurLogin}</p>}
                <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-bold shadow" disabled={!nomCreation.trim() || !telCreation.trim() || pinCreation.length < 4 || pinCreation2.length < 4} onClick={creerCompteClient}>
                  ✅ Créer mon compte client
                </Button>
                <button className="text-sm text-muted-foreground hover:underline mt-2 text-center" onClick={() => { setCreationCompte(false); setErreurLogin(""); }}>← Retour à la connexion</button>
              </>
            ) : oubliEtape === 1 ? (
              <>
                <div className="font-semibold text-base">🔑 Code PIN oublié</div>
                <p className="text-xs text-muted-foreground">Entrez votre numéro de téléphone pour vérifier votre compte.</p>
                <Label className="pt-2">Téléphone</Label>
                <Input autoFocus inputMode="tel" value={oubliTel} onChange={e => setOubliTel(e.target.value)} placeholder="+225 07 00 00 00 00" />
                {erreurLogin && <p className="text-red-600 text-sm mt-1">{erreurLogin}</p>}
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base" disabled={!oubliTel.trim()} onClick={verifierTelOubli}>Vérifier</Button>
                <button className="text-sm text-muted-foreground hover:underline mt-2 text-center" onClick={() => { setOubli(false); setErreurLogin(""); }}>← Retour à la connexion</button>
              </>
            ) : (
              <>
                <div className="font-semibold text-base">🔑 Réinitialiser votre code PIN</div>
                <p className="text-xs text-muted-foreground">Entrez la clé transmise par l'administrateur, puis votre nouveau PIN.</p>
                <Label className="pt-2">Clé de réinitialisation</Label>
                <Input autoFocus inputMode="numeric" value={oubliCle} onChange={e => setOubliCle(e.target.value)} placeholder="Clé à 6 chiffres" />
                <Label className="pt-2">Nouveau code PIN (4 chiffres)</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={oubliPin}
                  onChange={e => setOubliPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                <Label className="pt-2">Confirmez le nouveau code PIN</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={oubliPin2}
                  onChange={e => setOubliPin2(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
                {erreurLogin && <p className="text-red-600 text-sm mt-1">{erreurLogin}</p>}
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base"
                  disabled={!oubliCle.trim() || oubliPin.length < 4 || oubliPin2.length < 4}
                  onClick={reinitialiserPin}>✅ Réinitialiser mon PIN</Button>
                <button className="text-sm text-muted-foreground hover:underline mt-2 text-center" onClick={() => { setOubli(false); setErreurLogin(""); setOubliEtape(1); }}>← Annuler</button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal du Profil Utilisateur */}
      <Dialog open={openProfil} onOpenChange={setOpenProfil}>
        <DialogContent className="bg-white text-zinc-900 rounded-lg p-6 max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>👤 Profil Utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2 text-sm">
            {/* Photo de profil : ajoutée et enregistrée en direct */}
            <div className="flex flex-col items-center gap-2">
              {userActif?.photo
                ? <img src={userActif.photo} alt="Photo de profil" className="w-24 h-24 rounded-full object-cover border-4 border-blue-600" />
                : <div className="w-24 h-24 rounded-full bg-zinc-200 border-4 border-zinc-300 flex items-center justify-center text-4xl">👤</div>}
              <input type="file" accept="image/*" capture="user" className="hidden" id="photo-profil-input" onChange={changerPhotoProfil} />
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => { const el = document.getElementById("photo-profil-input"); if (el) el.click(); }}>
                📷 {userActif?.photo ? "Changer ma photo" : "Ajouter une photo de profil"}
              </Button>
              {photoProfilMsg && <p className="text-xs text-green-600 font-semibold">✅ Photo enregistrée</p>}
            </div>
            <div className="p-3 bg-zinc-50 border rounded-lg">
              <p className="text-xs text-zinc-500">Nom Complet</p>
              <p className="font-bold text-zinc-900">{userActif?.nom || "Utilisateur MotoPièces"}</p>
            </div>
            <div className="p-3 bg-zinc-50 border rounded-lg">
              <p className="text-xs text-zinc-500">Téléphone / Contact</p>
              <p className="font-bold text-zinc-900">{userActif?.tel || userActif?.email || "Non renseigné"}</p>
            </div>
            <div className="p-3 bg-zinc-50 border rounded-lg">
              <p className="text-xs text-zinc-500">Rôle d'accès</p>
              <p className="font-bold text-blue-600">{r.emoji} {r.titre}</p>
            </div>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
              onClick={() => { setOpenProfil(false); deconnexion(); }}
            >
              🚪 Se déconnecter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu développeur (accessible en maintenant le logo 10 secondes) */}
      <Dialog open={menuDev} onOpenChange={o => { setMenuDev(o); if (!o) { setCodeOk(false); setCodeSaisi(""); } }}>
        <DialogContent className="bg-white text-zinc-900 rounded-lg p-4 border shadow-xl" style={{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxWidth:"300px",width:"90%",zIndex:60}}>
          <ContenuMenuDev codeOk={codeOk} setCodeOk={setCodeOk} codeSaisi={codeSaisi} setCodeSaisi={setCodeSaisi}
            nouvelAdmin={nouvelAdmin} setNouvelAdmin={setNouvelAdmin}
            comptes={comptes} setComptes={setComptes}
            fermer={() => { setMenuDev(false); setCodeOk(false); setCodeSaisi(""); }}
            CODE_DEV={CODE_DEV} />
        </DialogContent>
      </Dialog>

      {/* Vitrine des Marchandises & Bannières Publicitaires (Visibles aux clients et visiteurs) */}
      {(!role || role === "client") && (
        <div className="space-y-4">
          <SectionPublicites
            publicites={publicites}
            setPublicites={setPublicites}
            autoriserUpload={role === "admin"}
          />
          <VueClient
            produits={produits.filter(p => !boutiquesMasquees.includes(p.boutique || "MotoPièces Principal"))}
            marques={marques}
            creerVente={creerVente}
            photosCategories={photosCategories}
            photosMarques={photosMarques}
            categories={categories}
            onNegocierPrix={negocierPrixArticle}
            userActif={userActif}
            comptes={comptes}
          />
        </div>
      )}

      {/* Vues Métier réservées au personnel de l'entreprise */}
      {role === "vendeur" && <VueVendeur produits={produits} ventes={ventes} creerVente={creerVente}
        categories={categories} credits={credits} cases={cases} />}
      {role === "secretaire" && <VueSecretaire ventes={ventes} confirmerPaiement={confirmerPaiement} majPrixLigne={majPrixLigne} modePrix={modePrix} entreprise={entreprise}
        credits={credits} ajouterCredit={ajouterCredit} ajouterVersement={ajouterVersement} validerCredit={validerCredit} />}
      {role === "vendeur-secretaire" && (
        <VueVendeurSecretaire produits={produits} marques={marques} ventes={ventes} creerVente={creerVente}
          confirmerPaiement={confirmerPaiement} majPrixLigne={majPrixLigne} modePrix={modePrix} entreprise={entreprise}
          credits={credits} ajouterCredit={ajouterCredit} ajouterVersement={ajouterVersement} validerCredit={validerCredit}
          categories={categories} cases={cases} />
      )}
      {role === "admin" && (
        <VueAdmin produits={produits} setProduits={setProduits} marques={marques} setMarques={setMarques}
          ventes={ventes} genererMarque={genererMarque}
          photosCategories={photosCategories} setPhotosCategories={setPhotosCategories}
          photosMarques={photosMarques} setPhotosMarques={setPhotosMarques}
          modePrix={modePrix} setModePrix={setModePrix} categories={categories} setCategories={setCategories}
          comptes={comptes} setComptes={setComptes}
          entreprise={entreprise} setEntreprise={setEntreprise}
          boutiquesMasquees={boutiquesMasquees}
          basculerVisibiliteBoutique={basculerVisibiliteBoutique}
          transfertsStock={transfertsStock}
          effectuerTransfertStock={effectuerTransfertStock}
          validerTransfertStock={validerTransfertStock}
          credits={credits}
          ajouterCredit={ajouterCredit}
          ajouterVersement={ajouterVersement}
          validerCredit={validerCredit}
          cases={cases} setCases={setCases}
          chefEquipe={userActif?.tel} />
      )}

      {/* Talkie-walkie vocal : visible uniquement pour l'administrateur et les vendeurs */}
      {/* Messagerie d'équipe type WhatsApp : visible uniquement pour l'administrateur et les vendeurs */}
      {TALKIE_ROLES.includes(role) && (
        <TalkieWalkie role={role} userActif={userActif} comptes={comptes} />
      )}

      {/* Messagerie photos / vidéos / textes / vocaux : contenu stocké dans les téléphones, purgé du serveur */}
      {TALKIE_ROLES.includes(role) && (
        <MessagerieEquipe role={role} userActif={userActif} comptes={comptes} />
      )}
    </div>
  );
}
