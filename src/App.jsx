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
import { supabase, synchroniserCompteSupabase, enregistrerVenteSupabase, chargerVentesSupabase } from "@/lib/supabase";
import { extraireTexteImage } from "@/lib/ocr";
import { demanderAssistantMistral } from "@/lib/mistral";
import { verifierQualiteImage } from "@/lib/imageProcessor";

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

  const demarrer = () => {
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

  const annuler = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setProgress(0);
  };

  return (
    <div className="relative inline-block w-full">
      <Button className={boutonClass} size="sm" variant="ghost"
        onPointerDown={demarrer} onPointerUp={annuler} onPointerLeave={annuler} onPointerCancel={annuler}>
        {progress > 0 ? `⏳ ${Math.ceil((100 - progress) * duree / 100 / 1000)}s…` : label}
      </Button>
      <div className="absolute bottom-0 left-1 right-1 h-1 bg-zinc-200 rounded overflow-hidden">
        <div className="h-full bg-green-600 transition-all" style={{ width: progress + "%" }} />
      </div>
    </div>
  );
}

// ---------- Composants communs ----------

function Produit({ p, onAjout, onRetirer, admin, onEditer, categories, qteDansPanier, onNegocierPrix }) {
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
            <div className="mt-1">
              <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                🏪 {nomBoutique}
              </Badge>
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
                  type="button"
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs h-10 font-bold"
                  onClick={() => {
                    if (onNegocierPrix) onNegocierPrix(p);
                    setOpenDetail(false);
                  }}
                >
                  🤝 Négocier
                </Button>
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
      {onConfirmer && v.statut !== "payée" && (
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

function VueClient({ produits, marques, creerVente, photosCategories, photosMarques, categories, onNegocierPrix }) {
  const [recherche, setRecherche] = useState("");
  const [cat, setCat] = useState("toutes");
  const [marque, setMarque] = useState("toutes");
  const [tri, setTri] = useState("pertinence");
  const [panier, setPanier] = useState([]);
  const [infos, setInfos] = useState(null);

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

  const total = panier.reduce((s, i) => s + i.p.prix * i.qte, 0);
  const ajouter = (p) => setPanier(prev => {
    const ex = prev.find(i => i.p.id === p.id);
    return ex ? prev.map(i => i.p.id === p.id ? { ...i, qte: Math.min(i.qte + 1, p.stock) } : i) : [...prev, { p, qte: 1 }];
  });

  const retirer = (p) => setPanier(prev => prev
    .map(i => i.p.id === p.id ? { ...i, qte: i.qte - 1 } : i)
    .filter(i => i.qte > 0));

  // Recherche rapide en bas : par nom ou par image
  const [modeRecherche, setModeRecherche] = useState(null); // "nom" | "image"
  const [nomRecherche, setNomRecherche] = useState("");
  const [photoRecherche, setPhotoRecherche] = useState(null);
  const [resultatsImage, setResultatsImage] = useState([]);

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
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base" disabled={!panier.length}
                    onClick={() => {
                      creerVente({ items: panier.map(i => ({ ...i.p, qte: i.qte })), total, client: infos?.nom || "Client", tel: infos?.tel || "", vendeur: "Client" });
                      setPanier([]); setInfos(null);
                    }}>Confirmer la commande</Button>
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
            onNegocierPrix={onNegocierPrix} />)}
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
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t shadow-lg p-3 max-h-64 overflow-auto">
          <input type="file" accept="image/*" capture="environment" className="hidden" id="photo-recherche-client" onChange={e => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => chercherParImage(r.result);
            r.readAsDataURL(f);
          }} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => document.getElementById("photo-recherche-client").click()}>📷 Photographier la pièce</Button>
            {photoRecherche && <img src={photoRecherche} alt="" className="w-10 h-10 rounded border object-contain" />}
          </div>
          <div className="mt-2 space-y-1">
            {resultatsImage.map(p => (
              <button key={p.id} onClick={() => { ajouter(p); setPhotoRecherche(null); setResultatsImage([]); setModeRecherche(null); }}
                className="w-full text-left border rounded-md p-2 hover:bg-zinc-100 flex justify-between items-center gap-2">
                <span className="flex items-center gap-2">
                  {p.photo && <img src={p.photo} alt="" className="w-8 h-8 rounded object-contain border bg-zinc-100" />}
                  <span className="text-sm font-medium">{p.nom}</span>
                </span>
                <span className="text-xs">{p.prix.toLocaleString("fr-FR")} FCFA — Ajouter</span>
              </button>
            ))}
            {photoRecherche && resultatsImage.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune correspondance trouvée — essayez la recherche par nom.</p>
            )}
          </div>
        </div>
      )}

      {/* Barre du bas : recherche par nom ou par image */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-2 flex justify-center gap-2">
        <Button variant={modeRecherche === "nom" ? "default" : "outline"}
          className={modeRecherche === "nom" ? "ring-2 ring-blue-600 ring-offset-1" : ""}
          onClick={() => setModeRecherche(modeRecherche === "nom" ? null : "nom")}>🔎 Par nom</Button>
        <Button variant={modeRecherche === "image" ? "default" : "outline"}
          className={modeRecherche === "image" ? "ring-2 ring-blue-600 ring-offset-1" : ""}
          onClick={() => setModeRecherche(modeRecherche === "image" ? null : "image")}>📷 Par image</Button>
      </div>
    </div>
  );
}

// ---------- Vue Vendeur ----------

function VueVendeur({ produits, ventes, creerVente }) {
  const [onglet, setOnglet] = useState("vendre");
  const [photos, setPhotos] = useState([]); // [{ src, article, qte }]
  const [enAnalyse, setEnAnalyse] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [identification, setIdentification] = useState(null); // index de la photo à identifier
  const [mode, setMode] = useState("image"); // "image" | "code"
  const [rechercheCode, setRechercheCode] = useState("");
  const [client, setClient] = useState({ nom: "", tel: "" });
  const [vendu, setVendu] = useState(false);
  const [filtreVentes, setFiltreVentes] = useState("toutes");

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

  // Compare la photo prise aux photos enregistrées des articles : seul l'article reconnu s'affiche
  const reconnaitre = async (src, index) => {
    const avecPhoto = produits.filter(p => p.photo);
    if (!avecPhoto.length) return;
    const sig = await sigImage(src);
    const dists = await Promise.all(avecPhoto.map(async p => ({ p, d: distanceSig(sig, await sigImage(p.photo)) })));
    dists.sort((x, y) => x.d - y.d);
    const best = dists[0];
    if (best && best.d < 0.22) {
      setPhotos(prev => prev.map((ph, j) => j === index ? { ...ph, article: best.p, reconnu: true } : ph));
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
    const liste = identifies.map(ph => ({ p: ph.article, qte: ph.qte, photo: ph.src }));
    creerVente({
      items: liste,
      total: totalAuto,
      client: client.nom || "Client", tel: client.tel, vendeur: "Vendeur",
      photo: liste[0].photo,
    });
    setVendu(true);
  };

  const reinitialiser = () => {
    setPhotos([]); setClient({ nom: "", tel: "" }); setVendu(false); setRecherche(""); setIdentification(null);
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex gap-2">
        <Button variant={onglet === "vendre" ? "default" : "outline"} className={onglet === "vendre" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("vendre")}>📷 Vendre</Button>
        <Button variant={onglet === "ventes" ? "default" : "outline"} className={onglet === "ventes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("ventes")}>📋 Ventes ({ventes.length})</Button>
      </div>

      {onglet === "vendre" ? (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Card className="bg-white">
            <CardContent className="p-6 space-y-4">
              {vendu ? (
                <div className="text-center space-y-3 py-8">
                  <div className="text-4xl">✅</div>
                  <div className="font-semibold text-lg">Vente envoyée à la secrétaire !</div>
                  <p className="text-sm text-muted-foreground">La secrétaire confirmera le paiement dès réception de l'argent.</p>
                  <Button onClick={reinitialiser}>📷 Nouvelle vente</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
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
                    <div className="text-4xl">📷</div>
                    <div className="font-semibold text-lg">Photographiez les marchandises</div>
                    <p className="text-sm text-muted-foreground">
                      Vous pouvez prendre <b>plusieurs photos en même temps</b> : chaque photo devient un article de la vente et le total se calcule automatiquement.
                    </p>
                    <input type="file" accept="image/*" capture="environment" className="hidden" id="photos-articles" onChange={prendrePhotos} />
                    <Button size="lg" onClick={() => document.getElementById("photos-articles").click()}>
                      📷 Prendre les photos des articles
                    </Button>
                  </div>

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
                        onClick={() => document.getElementById("photos-articles").click()}>
                        📷 Photographier un autre article
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input placeholder="Nom du client" value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} />
                          <Input placeholder="Téléphone" value={client.tel} onChange={e => setClient({ ...client, tel: e.target.value })} />
                          <Button disabled={identifies.length === 0 || photos.some(ph => !ph.article)}
                            onClick={envoyer}>➡️ Envoyer à la secrétaire</Button>
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
      ) : (
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
          <div className="flex gap-2 mb-4">
            <Button variant={filtreVentes === "toutes" ? "default" : "outline"} className={filtreVentes === "toutes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltreVentes("toutes")}>Toutes</Button>
            <Button variant={filtreVentes === "payée" ? "default" : "outline"} className={filtreVentes === "payée" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltreVentes("payée")}>Payées</Button>
            <Button variant={filtreVentes === "attente" ? "default" : "outline"} className={filtreVentes === "attente" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltreVentes("attente")}>En attente</Button>
          </div>
          {ventes.length === 0 ? <p className="text-muted-foreground">Aucune vente enregistrée pour le moment.</p> :
            (filtreVentes === "toutes" ? ventes : ventes.filter(v => filtreVentes === "payée" ? v.statut === "payée" : v.statut !== "payée"))
              .map(v => <LigneVente key={v.id} v={v} />)}
        </div>
      )}

      {/* Cagnotte flottante de la vente en cours */}
      {onglet === "vendre" && !vendu && identifies.length > 0 && (
        <div className="fixed bottom-4 right-4 z-30 bg-white border shadow-lg rounded-lg p-3 flex items-center gap-3">
          <div>
            <div className="text-xs text-muted-foreground">🧺 Cagnotte en cours</div>
            <div className="font-bold text-lg">{totalAuto.toLocaleString("fr-FR")} FCFA</div>
          </div>
          <Button disabled={photos.some(ph => !ph.article)} onClick={envoyer}>➡️ Envoyer à la secrétaire</Button>
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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

function VueSecretaire({ ventes, confirmerPaiement, majPrixLigne, modePrix, entreprise }) {
  const [filtre, setFiltre] = useState("toutes");
  const [questionRecu, setQuestionRecu] = useState(null); // après paiement : propose l'impression du reçu
  const [recuA4, setRecuA4] = useState(null); // reçu affiché en feuille A4
  const liste = filtre === "toutes" ? ventes : ventes.filter(v => v.statut === filtre);
  const totalCalcule = (v) => v.items.reduce((s, it) => s + (it.prixLigne ?? (it.p ? it.p.prix : it.prix)) * (it.qte || 1), 0);
  const totalPaye = ventes.filter(v => v.statut === "payée").reduce((s, v) => s + totalCalcule(v), 0);
  const totalAttente = ventes.filter(v => v.statut !== "payée").reduce((s, v) => s + totalCalcule(v), 0);
  const saisie = modePrix === "secretaire";

  const confirmerEtProposer = (id) => {
    confirmerPaiement(id);
    const v = ventes.find(x => x.id === id);
    if (v) setQuestionRecu({ ...v, statut: "payée", total: totalCalcule(v) });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
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
      <div className="flex gap-2 mb-4">
        <Button variant={filtre === "toutes" ? "default" : "outline"} className={filtre === "toutes" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("toutes")}>Toutes ({ventes.length})</Button>
        <Button variant={filtre === "attente" ? "default" : "outline"} className={filtre === "attente" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("attente")}>En attente ({ventes.filter(v => v.statut !== "payée").length})</Button>
        <Button variant={filtre === "payée" ? "default" : "outline"} className={filtre === "payée" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setFiltre("payée")}>Payées ({ventes.filter(v => v.statut === "payée").length})</Button>
      </div>
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
          {recuA4.items.map((it, i) => (
            <div key={i} className="text-[10px]">
              <div className="font-semibold">{it.p ? it.p.nom : it.nom}</div>
              <div className="flex justify-between">
                <span>{it.qte || 1} x {((it.prixLigne ?? (it.p ? it.p.prix : it.prix))).toLocaleString("fr-FR")}</span>
                <span>{((it.prixLigne ?? (it.p ? it.p.prix : it.prix)) * (it.qte || 1)).toLocaleString("fr-FR")} F</span>
              </div>
            </div>
          ))}
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
    </div>
  );
}

function VueVendeurSecretaire({ produits, marques, ventes, creerVente, confirmerPaiement, majPrixLigne, modePrix, entreprise }) {
  const [vue, setVue] = useState("vendre");
  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-3 flex gap-2">
        <Button variant={vue === "vendre" ? "default" : "outline"} className={vue === "vendre" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setVue("vendre")}>📷 Espace vente</Button>
        <Button variant={vue === "secretaire" ? "default" : "outline"} className={vue === "secretaire" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setVue("secretaire")}>💰 Espace secrétariat</Button>
      </div>
      {vue === "vendre"
        ? <VueVendeur produits={produits} marques={marques} ventes={ventes} creerVente={creerVente} />
        : <VueSecretaire ventes={ventes} confirmerPaiement={confirmerPaiement} majPrixLigne={majPrixLigne} modePrix={modePrix} entreprise={entreprise} />}
    </div>
  );
}

function VueAdmin({
  produits, setProduits, marques, setMarques, ventes, genererMarque,
  photosCategories, setPhotosCategories, photosMarques, setPhotosMarques,
  modePrix, setModePrix, categories, setCategories, comptes, setComptes,
  entreprise, setEntreprise, boutiquesMasquees = [], basculerVisibiliteBoutique = () => {},
  transfertsStock = [], effectuerTransfertStock = () => {}, validerTransfertStock = () => {}
}) {
  const [onglet, setOnglet] = useState("stats");
  const [recherche, setRecherche] = useState("");
  const [cat, setCat] = useState("toutes");
  const [marque, setMarque] = useState("toutes");
  const [tri, setTri] = useState("pertinence");
  const [edite, setEdite] = useState(null);
  const [code, setCode] = useState("");
  const [photoEdite, setPhotoEdite] = useState(null);
  const [mots, setMots] = useState("");
  const [prix, setPrix] = useState("");
  const [stock, setStock] = useState("");
  const [nouvelleMarque, setNouvelleMarque] = useState("");
  const [marqueAAjouter, setMarqueAAjouter] = useState(null);
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
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
    };
    setComptes(prev => [...prev, comp]);
    synchroniserCompteSupabase(comp);
    setNouveauCompte({ nom: "", tel: "", role: "vendeur", pin: "" });
  };

  const roleInfo = (r) => r === "client" ? "👤 Client" : r === "vendeur" ? "🧑‍🔧 Vendeur" : r === "secretaire" ? "👩‍💼 Secrétaire" : r === "vendeur-secretaire" ? "🧑‍🔧👩‍💼 Vendeur + Secrétaire" : "👑 Admin";

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
      stock: Number(stock) || 0, stockInit: Number(stock) || 0, photo: photoEdite || p.photo,
      mots: mots.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
    } : p));
    setPhotoEdite(null);
    setMots("");
    setEdite(null);
  };

  const confirmerMarque = (complet) => {
    const m = marqueAAjouter;
    if (m && !marques.includes(m)) setMarques(prev => [...prev, m]);
    if (complet && m) genererMarque(m);
    setMarqueAAjouter(null);
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex flex-wrap gap-2">
        <Button variant={onglet === "stats" ? "default" : "outline"} className={onglet === "stats" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("stats")}>📊 Statistiques</Button>
        <Button variant={onglet === "produits" ? "default" : "outline"} className={onglet === "produits" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("produits")}>📦 Produits ({produits.length})</Button>
        <Button variant={onglet === "marques" ? "default" : "outline"} className={onglet === "marques" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("marques")}>🏍️ Marques ({marques.length})</Button>
        <Button variant={onglet === "categories" ? "default" : "outline"} className={onglet === "categories" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("categories")}>🖼️ Catégories</Button>
        <Button variant={onglet === "boutiques" ? "default" : "outline"} className={onglet === "boutiques" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("boutiques")}>🏪 Magasins ({toutesLesBoutiques.length})</Button>
        <Button variant={onglet === "transferts" ? "default" : "outline"} className={onglet === "transferts" ? "ring-2 ring-blue-600 ring-offset-1" : ""} onClick={() => setOnglet("transferts")}>🔄 Transferts ({transfertsStock.length})</Button>
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
                <Produit key={p.id} p={p} categories={categories} admin onEditer={(pp) => { setEdite(pp); setCode(pp.code || ""); setPhotoEdite(null); setMots((pp.mots || []).join(", ")); setPrix(String(pp.prix)); setStock(String(pp.stock)); }} />
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAjoutOuvert(false)}>Annuler</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 text-base" disabled={!np.nom.trim() || !np.cat} onClick={enregistrerNouveau}>Ajouter</Button>
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

          {/* Liste des comptes */}
          <div className="text-sm text-muted-foreground mb-2">{comptes.length} compte{comptes.length > 1 ? "s" : ""} créé{comptes.length > 1 ? "s" : ""}</div>
          {comptes.map(c => (
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
          {comptes.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucun compte créé pour le moment. Utilisez le formulaire ci-dessus pour créer un compte client, vendeur ou secrétaire.</p>
          )}
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
function ChatFlottant({ userActif, entreprise, role, openChat, setOpenChat, articleNegociation }) {
  const [open, setOpen] = useState(false);
  const [canal, setCanal] = useState("assistance"); // "assistance" | "negociation" | "developpeur"
  const [messages, setMessages] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_chat_messages");
      return s ? JSON.parse(s) : [
        { id: 1, canal: "assistance", auteur: "Assistance MotoPièces", texte: "Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?", date: "09:00", audioUrl: null }
      ];
    } catch {
      return [
        { id: 1, canal: "assistance", auteur: "Assistance MotoPièces", texte: "Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?", date: "09:00", audioUrl: null }
      ];
    }
  });

  // Ouverture automatique et passage en canal négociation lorsqu'un client clique sur "Négocier"
  useEffect(() => {
    if (openChat) {
      setOpen(true);
      setCanal("negociation");
    }
  }, [openChat, articleNegociation]);

  const [texte, setTexte] = useState("");
  const [enEnregistrement, setEnEnregistrement] = useState(false);
  const [dureeVocal, setDureeVocal] = useState(0);
  const [enAnalyseOcr, setEnAnalyseOcr] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerVocalRef = useRef(null);
  const chatEndRef = useRef(null);

  const scannerImageOcr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEnAnalyseOcr(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const resultData = await extraireTexteImage(event.target.result);
      setEnAnalyseOcr(false);

      if (resultData.success && resultData.text) {
        const refs = resultData.references.length > 0 ? ` (Réf : ${resultData.references.join(", ")})` : "";
        setTexte((prev) => (prev ? `${prev} ${resultData.text}` : `🔍 [OCR] ${resultData.text}${refs}`));
      } else {
        alert("Aucun texte ou référence n'a pu être extrait de cette photo.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const estPersonnel = role === "vendeur" || role === "secretaire" || role === "vendeur-secretaire" || role === "admin";

  useEffect(() => {
    try {
      localStorage.setItem("motopieces_chat_messages", JSON.stringify(messages));
    } catch {}
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, canal]);

  // Démarrer l'enregistrement vocal via le micro
  const demarrerEnregistrement = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        envoyerVocal(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setEnEnregistrement(true);
      setDureeVocal(0);

      timerVocalRef.current = setInterval(() => {
        setDureeVocal((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Accès au microphone requis pour envoyer un message vocal.");
    }
  };

  // Arrêter l'enregistrement vocal
  const arreterEnregistrement = () => {
    if (mediaRecorderRef.current && enEnregistrement) {
      mediaRecorderRef.current.stop();
      setEnEnregistrement(false);
      clearInterval(timerVocalRef.current);
    }
  };

  // Envoyer un message texte
  const envoyerTexte = (e) => {
    if (e) e.preventDefault();
    const messageContenu = texte.trim();
    if (!messageContenu) return;

    const nouveauMsg = {
      id: Date.now(),
      canal,
      auteur: userActif?.nom || "Client",
      texte: messageContenu,
      audioUrl: null,
      date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, nouveauMsg]);
    setTexte("");

    // Appel à l'IA Mistral pour générer une réponse intelligente en temps réel
    setTimeout(async () => {
      let reponseAuteur = "🤖 IA MotoPièces (Mistral)";
      let systemPrompt = "Tu es l'Assistant IA virtuel de la plateforme MotoPièces. Tu réponds poliment, clairement et brièvement en français aux clients sur les pièces détachées de moto (moteur, freins, bougies, kit chaîne, batteries) et les commandes.";

      if (canal === "negociation") {
        reponseAuteur = `🤖 Vendeur (${articleNegociation?.boutique || "MotoPièces"})`;
        systemPrompt = `Tu es le gérant commercial de la boutique ${articleNegociation?.boutique || "MotoPièces"}. Un client souhaite négocier le prix de l'article ${articleNegociation?.nom || "pièce moto"} (Prix affiché: ${articleNegociation?.prix || "à négocier"} FCFA). Réponds-lui poliment avec une contre-proposition commerciale avantageuse et courte.`;
      } else if (canal === "developpeur") {
        reponseAuteur = "👨‍💻 Support Développeur Platform";
        systemPrompt = "Tu es l'Ingénieur Support Développeur de la plateforme MotoPièces. Tu réponds aux vendeurs et administrateurs sur les fonctionnalités techniques de l'application.";
      }

      const reponseIA = await demanderAssistantMistral(
        [{ role: "user", content: messageContenu }],
        systemPrompt
      );

      const reponseTexte = reponseIA || (canal === "negociation"
        ? `Offre reçue concernant ${articleNegociation?.nom || "votre demande"}. Notre vendeur étudie votre prix.`
        : "Merci pour votre message ! Notre équipe étudie votre demande.");

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          canal,
          auteur: reponseAuteur,
          texte: reponseTexte,
          audioUrl: null,
          date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 800);
  };

  // Envoyer la note vocale enregistrée
  const envoyerVocal = (audioUrl) => {
    const nouveauMsg = {
      id: Date.now(),
      canal,
      auteur: userActif?.nom || "Client",
      texte: `🎙️ Message vocal (${dureeVocal}s)`,
      audioUrl,
      date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, nouveauMsg]);

    setTimeout(() => {
      let reponseAuteur = "Assistance MotoPièces";
      let reponseTexte = "Bien reçu votre note vocale ! Notre équipe écoute votre demande.";

      if (canal === "negociation") {
        reponseAuteur = `Vendeur (${articleNegociation?.boutique || "MotoPièces"})`;
        reponseTexte = "Note vocale reçue par le vendeur. Nous étudions votre négociation de prix.";
      } else if (canal === "developpeur") {
        reponseAuteur = "👨‍💻 Support Développeur Platform";
        reponseTexte = "Note vocale d'assistance technique transmise au développeur.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          canal,
          auteur: reponseAuteur,
          texte: reponseTexte,
          audioUrl: null,
          date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1500);
  };

  const messagesFiltres = messages.filter((m) => (m.canal || "assistance") === canal);

  return (
    <>
      {/* Bouton Flottant Fixe en Bas à Droite */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            const nextState = !open;
            setOpen(nextState);
            if (!nextState && setOpenChat) setOpenChat(false);
          }}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center transition-transform active:scale-90 border-2 border-white"
          title="Ouvrir le Chat & Messagerie Vocale"
        >
          {open ? <span className="text-xl font-bold">✕</span> : <span className="text-2xl">💬</span>}
        </Button>
      </div>

      {/* Fenêtre de Chat / Messagerie Instantanée Routée */}
      {open && (
        <Card className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[390px] h-[500px] bg-white border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* En-tête du Chat */}
          <div className="bg-zinc-900 text-white p-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <div>
                <p className="font-bold text-sm leading-tight">💬 Chat {entreprise?.nom || "MotoPièces"}</p>
                <p className="text-[10px] text-zinc-400">Routage dynamique par rôle</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white h-7 w-7 p-0"
              onClick={() => {
                setOpen(false);
                if (setOpenChat) setOpenChat(false);
              }}
            >
              ✕
            </Button>
          </div>

          {/* Sélecteur de Canaux selon le Rôle */}
          <div className="flex items-center border-b bg-zinc-100 p-1 gap-1 text-xs">
            <button
              onClick={() => setCanal("assistance")}
              className={`flex-1 py-1.5 px-1.5 rounded font-medium transition ${
                canal === "assistance" ? "bg-white text-blue-700 shadow-sm font-bold" : "text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              💬 Assistance
            </button>
            <button
              onClick={() => setCanal("negociation")}
              className={`flex-1 py-1.5 px-1.5 rounded font-medium transition ${
                canal === "negociation" ? "bg-white text-blue-700 shadow-sm font-bold" : "text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              🤝 Négociation
            </button>
            {estPersonnel && (
              <button
                onClick={() => setCanal("developpeur")}
                className={`flex-1 py-1.5 px-1.5 rounded font-medium transition ${
                  canal === "developpeur" ? "bg-white text-amber-800 shadow-sm font-bold" : "text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                👨‍💻 Développeur
              </button>
            )}
          </div>

          {/* Info sur l'article en cours de négociation */}
          {canal === "negociation" && articleNegociation && (
            <div className="p-2 px-3 bg-amber-50 border-b border-amber-200 text-xs flex items-center justify-between">
              <span className="truncate font-semibold text-amber-900">
                📦 {articleNegociation.nom} ({articleNegociation.prix ? `${articleNegociation.prix.toLocaleString("fr-FR")} FCFA` : "Prix à négocier"})
              </span>
              <Badge className="bg-amber-600 text-white text-[9px] shrink-0">🏪 {articleNegociation.boutique || "MotoPièces"}</Badge>
            </div>
          )}

          {/* Liste des Messages du Canal Sélectionné */}
          <ScrollArea className="flex-1 p-3 space-y-3 bg-zinc-50">
            {messagesFiltres.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">
                Aucun message dans ce canal. Envoyez votre premier message ou note vocale ci-dessous !
              </p>
            ) : (
              messagesFiltres.map((m) => {
                const estMoi = m.auteur === (userActif?.nom || "Client");
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col mb-3 ${estMoi ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-zinc-400 mb-0.5 px-1">{m.auteur} • {m.date}</span>
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] text-xs shadow-sm ${
                        estMoi
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-zinc-900 border rounded-bl-none"
                      }`}
                    >
                      <p className="font-medium">{m.texte}</p>
                      {m.audioUrl && (
                        <audio controls src={m.audioUrl} className="mt-2 w-full max-w-[220px] h-8 rounded" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </ScrollArea>

          {/* Barre de Saisie, Scanner OCR & Option Vocale */}
          <div className="p-2 border-t bg-white flex flex-col gap-1.5">
            {enAnalyseOcr && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium animate-pulse flex items-center justify-between">
                <span>🔍 Analyse OCR de la photo... Extraction des références...</span>
              </div>
            )}
            {enEnregistrement ? (
              <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                <span className="text-xs text-red-600 font-bold flex items-center gap-2">
                  🔴 Enregistrement vocal ({dureeVocal}s)
                </span>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3 font-bold"
                  onClick={arreterEnregistrement}
                >
                  ⏹️ Envoyer le vocal
                </Button>
              </div>
            ) : (
              <form onSubmit={envoyerTexte} className="flex items-center gap-1.5">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  id="chat-ocr-file"
                  onChange={scannerImageOcr}
                />
                <Input
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder={
                    canal === "negociation"
                      ? "Proposez votre prix au vendeur..."
                      : canal === "developpeur"
                      ? "Message d'assistance technique..."
                      : "Écrivez un message..."
                  }
                  className="flex-1 text-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-2 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  onClick={() => document.getElementById("chat-ocr-file").click()}
                  title="Scanner le texte ou la référence d'une photo (OCR)"
                >
                  🔍 OCR
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={demarrerEnregistrement}
                  title="Envoyer un message vocal"
                >
                  🎙️
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 font-bold"
                  disabled={!texte.trim()}
                >
                  Envoyer
                </Button>
              </form>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

// ---------- Composant Section Publicités & Promotions avec Analyse Qualité Image ----------
function SectionPublicites({ publicites, setPublicites, autoriserUpload = false }) {
  const [openModal, setOpenModal] = useState(false);
  const [titre, setTitre] = useState("");
  const [image, setImage] = useState(null);
  const [analyse, setAnalyse] = useState(null);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicites.map((pub) => (
            <Card key={pub.id} className="overflow-hidden shadow border hover:shadow-lg transition bg-white">
              <div className="relative h-48 bg-zinc-900 overflow-hidden">
                <img src={pub.image} alt={pub.titre} className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105" />
                {autoriserUpload && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 px-2 text-xs shadow"
                    onClick={() => supprimerPub(pub.id)}
                  >
                    🗑️ Supprimer
                  </Button>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-bold text-sm text-zinc-900">{pub.titre}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Publié le {pub.date}</p>
              </CardContent>
            </Card>
          ))}
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
  { id: 1, nom: "Administrateur Principal", tel: "+225 07 00 00 00 00", pin: "1234", role: "admin" },
  { id: 2, nom: "Vendeur Exemple", tel: "+225 05 00 00 00 00", pin: "0000", role: "vendeur" }
];

// ---------- App ----------

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
  const [produits, setProduits] = useState(() => {
    try {
      const s = localStorage.getItem("motopieces_produits");
      if (s) return JSON.parse(s);
    } catch {}
    return PRODUITS.map(p => ({ ...p, code: p.code || ("ART-" + String(p.id).padStart(3, "0")), stockInit: p.stock }));
  });
  const [marques, setMarques] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES_DEFAUT);
  const [photosCategories, setPhotosCategories] = useState({});
  const [photosMarques, setPhotosMarques] = useState({});
  const [ventes, setVentes] = useState(() => {
    try { const s = localStorage.getItem("motopieces_ventes"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [comptes, setComptes] = useState(() => {
    try { const s = localStorage.getItem("motopieces_comptes"); return s ? JSON.parse(s) : COMPTES_PAR_DEFAUT; } catch { return COMPTES_PAR_DEFAUT; }
  });
  const [entreprise, setEntreprise] = useState(() => {
    try { const s = localStorage.getItem("motopieces_entreprise"); if (s) return JSON.parse(s); } catch {}
    return { nom: "MotoPièces", tel: "+225 07 00 00 00 00", materiel: "Pièces de moto" };
  });
  const [modePrix, setModePrix] = useState("admin");
  const [nextVente, setNextVente] = useState(() => {
    try { const s = localStorage.getItem("motopieces_next_vente"); return s ? Number(s) : 1; } catch { return 1; }
  });
  const [nextId, setNextId] = useState(113);
  const [menuDev, setMenuDev] = useState(false);
  const [codeOk, setCodeOk] = useState(false);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [nouvelAdmin, setNouvelAdmin] = useState({ nom: "", tel: "" });
  const CODE_DEV = "5544894";

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
        if (ventesEnLigne && ventesEnLigne.length > 0) {
          setVentes(ventesEnLigne);
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

    // Routage automatique des ventes et notifications vers la boutique / vendeur concerné
    const premierProduit = v.items?.[0]?.p || v.items?.[0];
    const nomBoutique = premierProduit?.boutique || v.vendeur || userActif?.nom || entreprise.nom || "MotoPièces Principal";

    const nouvelleVente = {
      ...v,
      id: nextVente,
      vendeur: nomBoutique,
      boutique: nomBoutique,
      statut: "en attente",
      date: dateVente,
    };

    setVentes(prev => [nouvelleVente, ...prev]);
    setNextVente(n => n + 1);

    // Enregistrement de la transaction dans la table d'historique des ventes Supabase (public.sales & public.sale_items)
    await enregistrerVenteSupabase(nouvelleVente);

    // Décrément automatique du stock : 10 vendus → il reste 9
    setProduits(prev => prev.map(p => {
      const ligne = v.items.find(it => (it.p ? it.p.id : it.id) === p.id);
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

    if (venteValidee) {
      await enregistrerVenteSupabase(venteValidee);
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
    let id = nextId;
    const nouveaux = PIECES_STANDARDS.map(ps => ({
      id: id++, nom: `${ps.nom} ${m}`, cat: ps.cat, marque: m,
      prix: 0, stock: 10, stockInit: 10, note: 4.0, desc: `${ps.nom} pour ${m}.`,
      code: "ART-" + String(id).padStart(3, "0"),
    }));
    setNextId(id);
    setProduits(prev => [...prev, ...nouveaux]);
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

            {/* Logo & Titre MotoPièces */}
            <BoutonSupprimer label={<><IconeMoto /> <span className="text-lg sm:text-xl font-extrabold tracking-wide">{entreprise.nom || "MotoPièces"}</span><span className="block text-[10px] font-normal text-white/60 leading-tight">🛍️ {entreprise.materiel} — 📞 {entreprise.tel}</span></>} duree={7000}
              boutonClass="text-white hover:bg-white/10 text-left rounded p-1"
              onSupprimer={() => setMenuDev(true)} />
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
                  <span className="font-semibold text-xs max-w-[130px] sm:max-w-none truncate">
                    👤 {userActif?.nom || userActif?.tel || supabaseUser?.email || "Mon Profil"}
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
            {!oubli ? (
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

      {/* Menu développeur (accessible en maintenant le logo 7 secondes) */}
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
          />
        </div>
      )}

      {/* Vues Métier réservées au personnel de l'entreprise */}
      {role === "vendeur" && <VueVendeur produits={produits} marques={marques} ventes={ventes} creerVente={creerVente} />}
      {role === "secretaire" && <VueSecretaire ventes={ventes} confirmerPaiement={confirmerPaiement} majPrixLigne={majPrixLigne} modePrix={modePrix} entreprise={entreprise} />}
      {role === "vendeur-secretaire" && (
        <VueVendeurSecretaire produits={produits} marques={marques} ventes={ventes} creerVente={creerVente}
          confirmerPaiement={confirmerPaiement} majPrixLigne={majPrixLigne} modePrix={modePrix} entreprise={entreprise} />
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
          validerTransfertStock={validerTransfertStock} />
      )}

      {/* Bouton Flottant & Chat Routé par Rôle avec Option Vocale */}
      <ChatFlottant
        userActif={userActif}
        entreprise={entreprise}
        role={role}
        openChat={openChat}
        setOpenChat={setOpenChat}
        articleNegociation={articleNegociation}
      />
    </div>
  );
}
